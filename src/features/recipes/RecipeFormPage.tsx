import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import type { Recipe } from '../../api/types';
import { Button } from '../../components/Button';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Field } from '../../components/Field';
import { MacrosSummary } from '../../components/MacrosSummary';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { parseOptionalNumber } from '../../lib/format';
import { DIET_TAG_LABELS, FOOD_STATE_LABELS, MEAL_TYPE_LABELS, toOptions } from '../../lib/labels';
import { estimateNutrition } from '../../lib/nutrition';
import { FoodPicker } from './FoodPicker';
import {
  recipeFormSchema,
  toRecipeFormValues,
  toRecipeInput,
  type RecipeFormOutput,
  type RecipeFormValues,
} from './recipe-form.schema';
import { useRecipe, useSaveRecipe } from './recipes.queries';

/** `/recipes/new` and `/recipes/:id/edit`. */
export function RecipeFormPage() {
  const { id } = useParams();
  const recipe = useRecipe(id);

  if (!id) return <RecipeForm />;
  if (recipe.isPending) return <Spinner />;
  if (recipe.isError)
    return <ErrorAlert error={recipe.error} onRetry={() => void recipe.refetch()} />;
  return <RecipeForm recipe={recipe.data} />;
}

function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const navigate = useNavigate();
  const save = useSaveRecipe(recipe?.id);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RecipeFormValues, unknown, RecipeFormOutput>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: toRecipeFormValues(recipe),
  });
  const ingredients = useFieldArray({ control, name: 'ingredients' });
  const [watchedIngredients, watchedServings] = useWatch({
    control,
    name: ['ingredients', 'servings'],
  });

  const estimate = estimateNutrition(
    watchedIngredients.map((line) => ({
      food: line.food,
      quantityG: parseOptionalNumber(line.quantityG) ?? Number.NaN,
      isOptional: line.isOptional,
    })),
    parseOptionalNumber(watchedServings) ?? 1,
  );

  const onSubmit = (values: RecipeFormOutput): void => {
    save.mutate(toRecipeInput(values), { onSuccess: (saved) => navigate(`/recipes/${saved.id}`) });
  };

  const a11y = (name: string, error?: { message?: string }) => ({
    id: name,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': `${name}-msg`,
  });

  return (
    <>
      <Link
        to={recipe ? `/recipes/${recipe.id}` : '/recipes'}
        className="text-sm text-stone-600 hover:underline"
      >
        ← Back
      </Link>
      <PageHeader title={recipe ? `Edit: ${recipe.name}` : 'New recipe'} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            htmlFor="name"
            error={errors.name?.message}
            className="sm:col-span-2"
          >
            <input className="input" {...a11y('name', errors.name)} {...register('name')} />
          </Field>
          <Field label="Meal type" htmlFor="mealType" error={errors.mealType?.message}>
            <select
              className="input"
              {...a11y('mealType', errors.mealType)}
              {...register('mealType')}
            >
              {toOptions(MEAL_TYPE_LABELS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Servings" htmlFor="servings" error={errors.servings?.message}>
              <input
                className="input"
                inputMode="numeric"
                {...a11y('servings', errors.servings)}
                {...register('servings')}
              />
            </Field>
            <Field
              label="Time, min"
              htmlFor="prepTimeMinutes"
              error={errors.prepTimeMinutes?.message}
            >
              <input
                className="input"
                inputMode="numeric"
                {...a11y('prepTimeMinutes', errors.prepTimeMinutes)}
                {...register('prepTimeMinutes')}
              />
            </Field>
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-stone-700">Diet</legend>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {toOptions(DIET_TAG_LABELS).map((option) => (
                <label key={option.value} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" value={option.value} {...register('dietType')} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Description" htmlFor="description" hint="Optional" className="sm:col-span-2">
            <textarea
              className="input"
              rows={2}
              {...a11y('description')}
              {...register('description')}
            />
          </Field>
          <Field
            label="Instructions"
            htmlFor="instructions"
            error={errors.instructions?.message}
            className="sm:col-span-2"
          >
            <textarea
              className="input"
              rows={5}
              {...a11y('instructions', errors.instructions)}
              {...register('instructions')}
            />
          </Field>
        </div>

        <section aria-labelledby="ingredients-heading" className="space-y-3">
          <h2 id="ingredients-heading" className="text-lg font-semibold">
            Ingredients
          </h2>
          <p className="text-xs text-stone-500">
            Weight is for the whole recipe, in the state of the chosen food (150 g of dry rice ≠ 150 g of boiled).
          </p>
          {ingredients.fields.length === 0 ? (
            <p className="text-sm text-stone-500">No ingredients yet.</p>
          ) : (
            <ol className="space-y-2">
              {ingredients.fields.map((item, index) => {
                const error = errors.ingredients?.[index];
                const food = watchedIngredients[index]?.food ?? item.food;
                return (
                  <li
                    key={item.id}
                    className="grid gap-2 rounded-lg border border-stone-200 bg-white p-3 sm:grid-cols-[1fr_7rem_1fr_auto] sm:items-start"
                  >
                    <div className="text-sm">
                      <span className="font-medium">{food.name}</span>{' '}
                      <span className="text-xs text-stone-500">
                        ({FOOD_STATE_LABELS[food.state]})
                      </span>
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
                        <input type="checkbox" {...register(`ingredients.${index}.isOptional`)} />
                        optional
                      </label>
                    </div>
                    <div>
                      <label htmlFor={`ingredients.${index}.quantityG`} className="sr-only">
                        Weight of {food.name}, g
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          className="input"
                          inputMode="decimal"
                          {...a11y(`ingredients.${index}.quantityG`, error?.quantityG)}
                          {...register(`ingredients.${index}.quantityG`)}
                        />
                        <span className="text-sm text-stone-500">g</span>
                      </div>
                      {error?.quantityG && (
                        <p
                          id={`ingredients.${index}.quantityG-msg`}
                          className="text-xs text-red-600"
                        >
                          {error.quantityG.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor={`ingredients.${index}.notes`} className="sr-only">
                        Note for {food.name}
                      </label>
                      <input
                        className="input"
                        placeholder="Note"
                        {...a11y(`ingredients.${index}.notes`, error?.notes)}
                        {...register(`ingredients.${index}.notes`)}
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        aria-label={`Move up: ${food.name}`}
                        disabled={index === 0}
                        onClick={() => ingredients.move(index, index - 1)}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Move down: ${food.name}`}
                        disabled={index === ingredients.fields.length - 1}
                        onClick={() => ingredients.move(index, index + 1)}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Remove ${food.name}`}
                        onClick={() => ingredients.remove(index)}
                      >
                        ✕
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {errors.ingredients?.root?.message && (
            <p className="text-sm text-red-600">{errors.ingredients.root.message}</p>
          )}
          {errors.ingredients?.message && (
            <p className="text-sm text-red-600">{errors.ingredients.message}</p>
          )}
          <FoodPicker
            onPick={(food) =>
              ingredients.append({ food, quantityG: '100', isOptional: false, notes: '' })
            }
          />
        </section>

        <section aria-labelledby="estimate-heading" className="space-y-3">
          <h2 id="estimate-heading" className="text-lg font-semibold">
            Calories and macros (preview)
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <MacrosSummary
              caption="Per serving"
              values={estimate.perServing}
              missing={estimate.missing}
            />
            <MacrosSummary
              caption="Whole recipe"
              values={estimate.total}
              missing={estimate.missing}
            />
          </div>
          {estimate.missing.length > 0 && (
            <p className="text-sm text-amber-700">
              * Some ingredient values are unknown and counted as 0.
            </p>
          )}
        </section>

        {save.isError && <ErrorAlert error={save.error} title="Could not save the recipe" />}

        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}

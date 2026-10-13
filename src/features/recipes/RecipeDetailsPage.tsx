import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Recipe } from '../../api/types';
import { Button } from '../../components/Button';
import { buttonClass } from '../../components/button-class';
import { ErrorAlert } from '../../components/ErrorAlert';
import { MacrosSummary } from '../../components/MacrosSummary';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatNumber } from '../../lib/format';
import { DIET_TAG_LABELS, FOOD_STATE_LABELS, MEAL_TYPE_LABELS } from '../../lib/labels';
import { useDeleteRecipe, useRecipe, useRecipeNutrition } from './recipes.queries';

export function RecipeDetailsPage() {
  const { id } = useParams();
  const recipe = useRecipe(id);

  if (recipe.isPending) return <Spinner />;
  if (recipe.isError)
    return <ErrorAlert error={recipe.error} onRetry={() => void recipe.refetch()} />;
  return <RecipeDetails recipe={recipe.data} />;
}

function RecipeDetails({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate();
  const [includeOptional, setIncludeOptional] = useState(false);
  const nutrition = useRecipeNutrition(recipe.id, includeOptional);
  const remove = useDeleteRecipe();
  const hasOptional = recipe.ingredients.some((ingredient) => ingredient.isOptional);

  const onDelete = (): void => {
    if (!window.confirm(`Delete the recipe “${recipe.name}”?`)) return;
    remove.mutate(recipe.id, { onSuccess: () => navigate('/recipes') });
  };

  return (
    <>
      <Link to="/recipes" className="text-sm text-stone-600 hover:underline">
        ← All recipes
      </Link>
      <PageHeader
        title={recipe.name}
        actions={
          <>
            <Link to={`/recipes/${recipe.id}/edit`} className={buttonClass('secondary')}>
              Edit
            </Link>
            <Button variant="danger" onClick={onDelete} loading={remove.isPending}>
              Delete
            </Button>
          </>
        }
      >
        {MEAL_TYPE_LABELS[recipe.mealType]} · {recipe.servings} serv.
        {recipe.prepTimeMinutes !== null && ` · ${recipe.prepTimeMinutes} min`}
        {recipe.dietType.length > 0 &&
          ` · ${recipe.dietType.map((tag) => DIET_TAG_LABELS[tag]).join(', ')}`}
      </PageHeader>
      {remove.isError && <ErrorAlert error={remove.error} title="Could not delete the recipe" />}
      {recipe.description && <p className="mb-6 text-stone-700">{recipe.description}</p>}

      <section aria-labelledby="nutrition-heading" className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="nutrition-heading" className="text-lg font-semibold">
            Calories and macros
          </h2>
          {hasOptional && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeOptional}
                onChange={(event) => setIncludeOptional(event.target.checked)}
              />
              Include optional ingredients
            </label>
          )}
        </div>

        {nutrition.isPending ? (
          <Spinner label="Calculating nutrition…" />
        ) : nutrition.isError ? (
          <ErrorAlert error={nutrition.error} onRetry={() => void nutrition.refetch()} />
        ) : (
          <div className={nutrition.isPlaceholderData ? 'opacity-60' : ''}>
            <div className="grid gap-4 lg:grid-cols-2">
              <MacrosSummary caption="Per serving" values={nutrition.data.perServing} />
              <MacrosSummary
                caption={`Whole recipe (${recipe.servings} serv.)`}
                values={nutrition.data.total}
              />
            </div>
            {!nutrition.data.complete && (
              <p className="mt-2 text-sm text-amber-700">
                Incomplete data: some ingredients have unknown values (marked *), they are counted
                as 0.
              </p>
            )}
            <p className="mt-2 text-xs text-stone-500">
              Sum of the ingredients in their given state; water and oil losses during cooking are
              not taken into account.
            </p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Ingredients and their contribution to calories and macros
                </caption>
                <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-600">
                  <tr>
                    <th className="px-3 py-2">Ingredient</th>
                    <th className="px-3 py-2 text-right">Weight, g</th>
                    <th className="px-3 py-2 text-right">Kcal</th>
                    <th className="px-3 py-2 text-right">P</th>
                    <th className="px-3 py-2 text-right">F</th>
                    <th className="px-3 py-2 text-right">C</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {nutrition.data.ingredients.map((line) => {
                    const notes = recipe.ingredients.find((i) => i.id === line.ingredientId)?.notes;
                    const cell = (macro: keyof typeof line.macros) => (
                      <td className="px-3 py-2 text-right tabular-nums">
                        {line.counted ? formatNumber(line.macros[macro]) : '—'}
                        {line.counted && line.missing.includes(macro) && (
                          <span className="text-amber-600">*</span>
                        )}
                      </td>
                    );
                    return (
                      <tr key={line.ingredientId} className={line.counted ? '' : 'text-stone-400'}>
                        <td className="px-3 py-2">
                          <Link to={`/foods/${line.foodItemId}`} className="hover:underline">
                            {line.foodName}
                          </Link>{' '}
                          <span className="text-xs text-stone-500">
                            ({FOOD_STATE_LABELS[line.state]})
                          </span>
                          {line.isOptional && <span className="ml-1 text-xs">· optional</span>}
                          {notes && <div className="text-xs text-stone-500">{notes}</div>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatNumber(line.quantityG)}
                        </td>
                        {cell('kcal')}
                        {cell('proteinG')}
                        {cell('fatG')}
                        {cell('carbsG')}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="instructions-heading">
        <h2 id="instructions-heading" className="mb-2 text-lg font-semibold">
          Instructions
        </h2>
        <p className="whitespace-pre-line text-stone-800">{recipe.instructions}</p>
      </section>
    </>
  );
}

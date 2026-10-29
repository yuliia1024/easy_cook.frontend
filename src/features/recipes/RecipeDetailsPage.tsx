import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import type { Macro, Recipe } from '../../api/types';
import { Button } from '../../components/Button';
import { buttonClass } from '../../components/button-class';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorAlert } from '../../components/ErrorAlert';
import { MacrosSummary } from '../../components/MacrosSummary';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatNumber, formatServings, servingsLabel } from '../../lib/format';
import { DIET_TAG_LABELS, FOOD_STATE_LABELS, MEAL_TYPE_LABELS } from '../../lib/labels';
import { parseMenuServings, scaleMacros } from '../../lib/menu-servings';
import { useDeleteRecipe, useRecipe, useRecipeNutrition } from './recipes.queries';

/** Ingredient columns in the colors of the tiles above. */
const CELL_TONES: Record<Macro, string> = {
  kcal: 'font-semibold',
  proteinG: 'text-protein-fg',
  fatG: 'text-fat-fg',
  carbsG: 'text-carbs-fg',
};

export function RecipeDetailsPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const recipe = useRecipe(id);

  if (recipe.isPending) return <Spinner />;
  if (recipe.isError)
    return <ErrorAlert error={recipe.error} onRetry={() => void recipe.refetch()} />;
  return (
    <RecipeDetails
      recipe={recipe.data}
      menuServings={parseMenuServings(searchParams.get('servings'))}
    />
  );
}

/**
 * A recipe; opened from a menu meal (`menuServings`), also the calories and macros of the meal,
 * and the ingredients in the amounts of the meal instead of the whole recipe.
 */
function RecipeDetails({ recipe, menuServings }: { recipe: Recipe; menuServings: number | null }) {
  const navigate = useNavigate();
  const [includeOptional, setIncludeOptional] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const nutrition = useRecipeNutrition(recipe.id, includeOptional);
  const remove = useDeleteRecipe();
  const hasOptional = recipe.ingredients.some((ingredient) => ingredient.isOptional);
  /** The share of the whole recipe the ingredient table shows. */
  const tableFactor = menuServings === null ? 1 : menuServings / recipe.servings;

  const onDelete = (): void => {
    setDeleting(false);
    remove.mutate(recipe.id, { onSuccess: () => navigate('/recipes') });
  };

  return (
    <>
      <Link to="/recipes" className="text-sm text-sage-600 hover:underline">
        ← All recipes
      </Link>
      <PageHeader
        title={recipe.name}
        actions={
          <>
            <Link to={`/recipes/${recipe.id}/edit`} className={buttonClass('secondary')}>
              Edit
            </Link>
            <Button variant="danger" onClick={() => setDeleting(true)} loading={remove.isPending}>
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
      {deleting && (
        <ConfirmDialog
          title="Delete this recipe?"
          confirmLabel="Delete"
          onConfirm={onDelete}
          onCancel={() => setDeleting(false)}
        >
          “{recipe.name}” will be permanently deleted. Saved menus keep its name but lose the link.
        </ConfirmDialog>
      )}
      {remove.isError && <ErrorAlert error={remove.error} title="Could not delete the recipe" />}
      {recipe.description && <p className="mb-6 text-sage-700">{recipe.description}</p>}

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
            {menuServings !== null && (
              <MacrosSummary
                caption={`For your menu (${servingsLabel(menuServings)})`}
                values={scaleMacros(nutrition.data.perServing, menuServings)}
                highlight
              />
            )}
            <div className={`grid gap-4 lg:grid-cols-2 ${menuServings !== null ? 'mt-4' : ''}`}>
              <MacrosSummary caption="Per serving" values={nutrition.data.perServing} highlight />
              <MacrosSummary
                caption={`Whole recipe (${recipe.servings} serv.)`}
                values={nutrition.data.total}
                highlight
              />
            </div>
            {!nutrition.data.complete && (
              <p className="mt-2 text-sm text-amber-700">
                Incomplete data: some ingredients have unknown values (marked *), they are counted
                as 0.
              </p>
            )}
            <p className="mt-2 text-xs text-sage-500">
              Sum of the ingredients in their given state; water and oil losses during cooking are
              not taken into account.
            </p>

            {menuServings !== null && (
              <p className="mt-4 text-sm text-sage-700">
                Ingredients for {servingsLabel(menuServings)}; the recipe makes {recipe.servings}.
              </p>
            )}
            <div className="mt-4 card overflow-x-auto p-0">
              <table className="data-table">
                <caption className="sr-only">
                  Ingredients and their contribution to calories and macros
                  {menuServings !== null && `, for ${formatServings(menuServings)} servings`}
                </caption>
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th className="text-right">Weight, g</th>
                    <th className="text-right">Kcal</th>
                    <th className="text-right text-protein-fg!">P</th>
                    <th className="text-right text-fat-fg!">F</th>
                    <th className="text-right text-carbs-fg!">C</th>
                  </tr>
                </thead>
                <tbody>
                  {nutrition.data.ingredients.map((line) => {
                    const notes = recipe.ingredients.find((i) => i.id === line.ingredientId)?.notes;
                    const macros = scaleMacros(line.macros, tableFactor);
                    const cell = (macro: keyof typeof line.macros) => (
                      <td
                        className={`text-right tabular-nums ${line.counted ? CELL_TONES[macro] : ''}`}
                      >
                        {line.counted ? formatNumber(macros[macro]) : '—'}
                        {line.counted && line.missing.includes(macro) && (
                          <span className="text-amber-600">*</span>
                        )}
                      </td>
                    );
                    return (
                      <tr key={line.ingredientId} className={line.counted ? '' : 'text-sage-400'}>
                        <td>
                          <Link to={`/foods/${line.foodItemId}`} className="hover:underline">
                            {line.foodName}
                          </Link>{' '}
                          <span className="text-xs text-sage-500">
                            ({FOOD_STATE_LABELS[line.state]})
                          </span>
                          {line.isOptional && <span className="ml-1 text-xs">· optional</span>}
                          {notes && <div className="text-xs text-sage-500">{notes}</div>}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatNumber(line.quantityG * tableFactor)}
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
        <p className="whitespace-pre-line text-sage-800">{recipe.instructions}</p>
      </section>
    </>
  );
}

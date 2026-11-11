import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import type { Recipe } from '../../api/types';
import { Button } from '../../components/Button';
import { buttonClass } from '../../components/button-class';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorAlert } from '../../components/ErrorAlert';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { DIET_TAG_LABELS, MEAL_TYPE_LABELS } from '../../lib/labels';
import { parseMenuServings } from '../../lib/menu-servings';
import { RecipeOverview } from './RecipeOverview';
import { useDeleteRecipe, useRecipe } from './recipes.queries';

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
  const [deleting, setDeleting] = useState(false);
  const remove = useDeleteRecipe();

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
      <RecipeOverview recipe={recipe} menuServings={menuServings} />
    </>
  );
}

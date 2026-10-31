import { Link } from 'react-router';
import { buttonClass } from '../../components/button-class';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { menuRecipePath } from '../../lib/menu-servings';
import { recipeFacts } from './recipe-facts';
import { RecipeOverview } from './RecipeOverview';
import { useRecipe } from './recipes.queries';

interface Props {
  recipeId: string;
  /** The servings of the menu meal the recipe is opened from. */
  servings: number;
  onClose: () => void;
}

/** The recipe of a menu meal in a modal window, in the amounts of the meal. */
export function RecipeDialog({ recipeId, servings, onClose }: Props) {
  const recipe = useRecipe(recipeId);

  return (
    <Modal
      title={recipe.data?.name ?? 'Recipe'}
      onClose={onClose}
      actions={
        <Link to={menuRecipePath(recipeId, servings)} className={buttonClass('secondary')}>
          Open page
        </Link>
      }
    >
      {recipe.isPending ? (
        <Spinner />
      ) : recipe.isError ? (
        <ErrorAlert error={recipe.error} onRetry={() => void recipe.refetch()} />
      ) : (
        <>
          <p className="mb-4 text-sm text-sage-500">{recipeFacts(recipe.data)}</p>
          <RecipeOverview recipe={recipe.data} menuServings={servings} />
        </>
      )}
    </Modal>
  );
}

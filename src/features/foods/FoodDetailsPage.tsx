import { Link, useParams } from 'react-router';
import { buttonClass } from '../../components/button-class';
import { ErrorAlert } from '../../components/ErrorAlert';
import { MacrosSummary } from '../../components/MacrosSummary';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatDate } from '../../lib/format';
import { FOOD_SOURCE_LABELS, FOOD_STATE_LABELS } from '../../lib/labels';
import { useFood } from './foods.queries';

export function FoodDetailsPage() {
  const { id } = useParams();
  const food = useFood(id);

  if (food.isPending) return <Spinner />;
  if (food.isError) return <ErrorAlert error={food.error} onRetry={() => void food.refetch()} />;

  const { data } = food;
  const hasUnknown = [data.kcalPer100g, data.proteinG, data.fatG, data.carbsG].some(
    (v) => v === null,
  );

  return (
    <>
      <Link to="/foods" className="text-sm text-sage-600 hover:underline">
        ← All foods
      </Link>
      <PageHeader
        title={data.name}
        actions={
          <Link to={`/foods/${data.id}/edit`} className={buttonClass('secondary')}>
            Edit
          </Link>
        }
      >
        {data.nameEn && <span>{data.nameEn} · </span>}
        state: <strong>{FOOD_STATE_LABELS[data.state]}</strong>
      </PageHeader>

      <MacrosSummary
        caption="Per 100 g of the food in this state"
        values={{
          kcal: data.kcalPer100g,
          proteinG: data.proteinG,
          fatG: data.fatG,
          carbsG: data.carbsG,
        }}
      />
      {hasUnknown && (
        <p className="mt-2 text-sm text-amber-700">
          Some values are unknown (“—”). Recipe calculations count them as 0 and mark the result as
          incomplete.
        </p>
      )}

      <dl className="mt-6 grid gap-2 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-6">
        <dt className="text-sage-500">Source</dt>
        <dd>
          {FOOD_SOURCE_LABELS[data.source]}
          {data.sourceId && <span className="text-sage-500"> · {data.sourceId}</span>}
        </dd>
        <dt className="text-sage-500">Updated</dt>
        <dd>{formatDate(data.updatedAt)}</dd>
      </dl>
    </>
  );
}

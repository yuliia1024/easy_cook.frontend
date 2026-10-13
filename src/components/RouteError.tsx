import { Link, useRouteError } from 'react-router';
import { buttonClass } from './button-class';
import { ErrorAlert } from './ErrorAlert';

/** Fallback for a render error anywhere below the layout route. */
export function RouteError() {
  const error = useRouteError();
  return (
    <div className="mx-auto max-w-xl p-6">
      <ErrorAlert error={error} title="Сторінка зламалася" />
      <Link to="/" className={`${buttonClass('secondary')} mt-4`}>
        На головну
      </Link>
    </div>
  );
}

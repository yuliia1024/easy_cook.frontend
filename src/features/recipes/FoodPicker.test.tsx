import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildFood, page } from '../../test/fixtures';
import { createQueryWrapper } from '../../test/query-wrapper';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { FoodPicker } from './FoodPicker';

const rice = buildFood({ id: 'rice', name: 'Rice, dry', kcalPer100g: 360 });

function renderPicker(onSubmit = vi.fn()) {
  const onPick = vi.fn();
  const { wrapper } = createQueryWrapper();
  render(
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <FoodPicker onPick={onPick} />
      <button type="submit">Save</button>
    </form>,
    { wrapper },
  );
  return { onPick, onSubmit, user: userEvent.setup() };
}

const search = () => screen.getByLabelText('Add an ingredient from the catalog');

describe('FoodPicker', () => {
  it('searches the catalog and hands over the picked food', async () => {
    let requested: string | null = null;
    server.use(
      http.get(api('/foods'), ({ request }) => {
        requested = new URL(request.url).searchParams.get('search');
        return HttpResponse.json(page([rice]));
      }),
    );
    const { onPick, user } = renderPicker();

    await user.type(search(), 'ri');
    await user.click(await screen.findByRole('button', { name: 'Add Rice, dry' }));

    expect(requested).toBe('ri');
    expect(onPick).toHaveBeenCalledWith(rice);
    expect(search()).toHaveValue('');
  });

  it('does not submit the surrounding form on Enter', async () => {
    server.use(http.get(api('/foods'), () => HttpResponse.json(page([rice]))));
    const { onSubmit, user } = renderPicker();

    await user.type(search(), 'ri{Enter}');
    expect(await screen.findByRole('button', { name: 'Add Rice, dry' })).toBeInTheDocument();
    await user.type(search(), '{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not search below two characters', async () => {
    let requests = 0;
    server.use(
      http.get(api('/foods'), () => {
        requests += 1;
        return HttpResponse.json(page([rice]));
      }),
    );
    const { user } = renderPicker();

    await user.type(search(), ' r ');
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(requests).toBe(0);
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Search results' })).not.toBeInTheDocument();
  });

  it('says when nothing is found', async () => {
    server.use(http.get(api('/foods'), () => HttpResponse.json(page([]))));
    const { user } = renderPicker();

    await user.type(search(), 'zz');

    expect(
      await screen.findByText('Nothing found. Add the food to the catalog first.'),
    ).toBeInTheDocument();
  });

  it('shows a search error with a retry', async () => {
    server.use(http.get(api('/foods'), () => apiError(503, 'Database is unavailable')));
    const { user } = renderPicker();

    await user.type(search(), 'ri');

    expect(await screen.findByRole('alert')).toHaveTextContent('Database is unavailable');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

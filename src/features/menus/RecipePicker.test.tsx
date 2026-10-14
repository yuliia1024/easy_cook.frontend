import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { buildRecipe, page } from '../../test/fixtures';
import { api, http, HttpResponse, server } from '../../test/server';
import { RecipePicker } from './RecipePicker';

function renderPicker(onPick = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RecipePicker id="picker" onPick={onPick} />
    </QueryClientProvider>,
  );
  return { onPick, user: userEvent.setup() };
}

describe('RecipePicker', () => {
  it('searches from two characters and hands over the chosen recipe', async () => {
    const searches: string[] = [];
    server.use(
      http.get(api('/recipes'), ({ request }) => {
        searches.push(new URL(request.url).searchParams.get('search')!);
        return HttpResponse.json(page([buildRecipe()]));
      }),
    );
    const { user, onPick } = renderPicker();

    await user.type(screen.getByLabelText('Search recipes'), 'b');
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Search recipes'), 'u');

    const option = await screen.findByRole('button', { name: 'Choose Buckwheat with chicken' });
    expect(screen.getByText(/257.3 kcal\/serving/)).toBeInTheDocument();
    await user.click(option);

    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Buckwheat with chicken' }),
    );
    expect(screen.getByLabelText('Search recipes')).toHaveValue('');
    expect(searches).toEqual(['bu']);
  });

  it('says when nothing is found', async () => {
    server.use(http.get(api('/recipes'), () => HttpResponse.json(page([]))));
    const { user } = renderPicker();

    await user.type(screen.getByLabelText('Search recipes'), 'zzz');
    expect(await screen.findByText('Nothing found.')).toBeInTheDocument();
  });
});

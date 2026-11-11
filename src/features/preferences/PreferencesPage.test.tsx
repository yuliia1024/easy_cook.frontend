import { screen } from '@testing-library/react';
import { buildPreference } from '../../test/fixtures';
import { renderPage } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { PreferencesPage } from './PreferencesPage';

const render = () => renderPage(<PreferencesPage />, '/preferences', '/preferences');

describe('PreferencesPage', () => {
  it('lists preferences and deletes one', async () => {
    let deleted = '';
    const diet = buildPreference({ id: 'p2', preferenceType: 'diet', value: 'gluten_free' });
    server.use(
      http.get(api('/preferences'), () =>
        HttpResponse.json(deleted ? [diet] : [buildPreference(), diet]),
      ),
      http.delete(api('/preferences/:id'), ({ params }) => {
        deleted = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = render();

    expect(await screen.findByText('peanut')).toBeInTheDocument();
    expect(screen.getByText('gluten-free')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete peanut' }));

    await vi.waitFor(() => expect(screen.queryByText('peanut')).not.toBeInTheDocument());
    expect(deleted).toBe(buildPreference().id);
  });

  it('adds a diet from the list and shows a server rejection', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.get(api('/preferences'), () => HttpResponse.json([])),
      http.post(api('/preferences'), async ({ request }) => {
        bodies.push(await request.json());
        return apiError(400, 'Diet "pescatarian" conflicts with "vegan"');
      }),
    );
    const { user } = render();

    expect(await screen.findByText('No preferences yet')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Type'), 'diet');
    await user.selectOptions(screen.getByLabelText('Diet'), 'pescatarian');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('conflicts with "vegan"');
    expect(bodies).toEqual([{ preferenceType: 'diet', value: 'pescatarian' }]);
  });

  it('adds a diet while the hidden text field still holds a too long value', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.get(api('/preferences'), () => HttpResponse.json([])),
      http.post(api('/preferences'), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(buildPreference({ preferenceType: 'diet', value: 'vegan' }));
      }),
    );
    const { user } = render();

    await screen.findByText('No preferences yet');
    await user.click(screen.getByLabelText('Food'));
    await user.paste('x'.repeat(121));
    await user.selectOptions(screen.getByLabelText('Type'), 'diet');
    await user.selectOptions(screen.getByLabelText('Diet'), 'vegan');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await vi.waitFor(() => expect(bodies).toEqual([{ preferenceType: 'diet', value: 'vegan' }]));
  });

  it('requires a food for an allergy', async () => {
    server.use(http.get(api('/preferences'), () => HttpResponse.json([])));
    const { user } = render();

    await user.click(await screen.findByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Enter a value')).toBeInTheDocument();
  });

  it('asks for the profile first', async () => {
    server.use(http.get(api('/preferences'), () => apiError(404, 'Profile is not filled in yet')));
    render();
    expect(await screen.findByText('Fill in the profile first')).toBeInTheDocument();
  });
});

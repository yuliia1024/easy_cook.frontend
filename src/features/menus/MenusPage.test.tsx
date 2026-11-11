import { screen, within } from '@testing-library/react';
import type { MenuSummary } from '../../api/types';
import { buildMenu, buildMenuSummary, buildMenuVersion } from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { MenusPage } from './MenusPage';

const routes = [
  { path: '/menus', element: <MenusPage /> },
  { path: '/menus/:id', element: <MenusPage /> },
];

const confirmedMenu = (n: number, day: number): MenuSummary =>
  buildMenuSummary({
    id: `c${n}`,
    title: `Confirmed ${n}`,
    confirmedVersionId: 'v',
    confirmedAt: `2026-10-${String(day).padStart(2, '0')}T10:00:00.000Z`,
  });

const draftMenu = (n: number): MenuSummary =>
  buildMenuSummary({ id: `d${n}`, title: `Draft ${n}`, versionCount: n });

/** Serves both lists and every menu by id. */
function serve(confirmed: MenuSummary[], drafts: MenuSummary[]) {
  server.use(
    http.get(api('/menus'), ({ request }) => {
      const status = new URL(request.url).searchParams.get('status');
      return HttpResponse.json(status === 'draft' ? drafts : confirmed);
    }),
    http.get(api('/menus/:id'), ({ params }) => {
      const summary = [...confirmed, ...drafts].find((m) => m.id === params.id);
      return HttpResponse.json(
        buildMenu({
          id: String(params.id),
          title: summary?.title ?? 'Unknown',
          confirmedAt: summary?.confirmedAt ?? null,
        }),
      );
    }),
  );
}

describe('MenusPage', () => {
  it('opens the menu confirmed last and marks it as active', async () => {
    // The API lists by creation; the active one is the last confirmed, not the last created.
    serve([confirmedMenu(1, 3), confirmedMenu(2, 20), confirmedMenu(3, 10)], [draftMenu(1)]);
    renderRoutes(routes, '/menus');

    expect(await screen.findByRole('heading', { level: 1, name: 'Confirmed 2' })).toBeVisible();
    const sidebar = screen.getByRole('navigation', { name: 'Saved menus' });
    const links = within(within(sidebar).getByRole('region', { name: 'Confirmed' })).getAllByRole(
      'link',
    );
    expect(links.map((l) => l.textContent)).toEqual([
      expect.stringContaining('Confirmed 2'),
      expect.stringContaining('Confirmed 3'),
      expect.stringContaining('Confirmed 1'),
    ]);
    expect(links[0]).toHaveTextContent('active');
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(links[1]).not.toHaveTextContent('active');
  });

  it('shows both groups at once and opens a draft from the list', async () => {
    serve([confirmedMenu(1, 3)], [draftMenu(1), draftMenu(2)]);
    const { user, router } = renderRoutes(routes, '/menus');

    expect(await screen.findByRole('heading', { level: 1, name: 'Confirmed 1' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: /Confirmed/ })).toHaveTextContent('1');
    expect(screen.getByRole('heading', { level: 2, name: /Drafts/ })).toHaveTextContent('2');
    const draft = await screen.findByRole('link', { name: /Draft 2/ });
    expect(draft).toHaveTextContent('2 versions · updated');

    await user.click(draft);
    expect(await screen.findByRole('heading', { level: 1, name: 'Draft 2' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/menus/d2');
    expect(screen.getByRole('link', { name: /Draft 2/ })).toHaveAttribute('aria-current', 'page');
    // The active menu keeps its mark while another one is open.
    expect(screen.getByRole('link', { name: /Confirmed 1/ })).toHaveTextContent('active');
    expect(screen.getByRole('link', { name: /Confirmed 1/ })).not.toHaveAttribute('aria-current');
  });

  it('lists the versions of a draft in a dropdown and opens one', async () => {
    serve([confirmedMenu(1, 3)], [draftMenu(3), draftMenu(1)]);
    server.use(
      http.get(api('/menus/d3'), () =>
        HttpResponse.json(
          buildMenu({
            id: 'd3',
            title: 'Draft 3',
            versions: [3, 2, 1].map((n) =>
              buildMenuVersion({ id: `v${n}`, versionNumber: n, notes: `Notes of v${n}` }),
            ),
          }),
        ),
      ),
    );
    const { user, router } = renderRoutes(routes, '/menus');

    const toggle = await screen.findByRole('button', { name: 'Versions of Draft 3' });
    // A draft with a single version has nothing to pick from.
    expect(screen.queryByRole('button', { name: 'Versions of Draft 1' })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /Version 2/ })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const versions = screen.getAllByRole('link', { name: /^Version/ });
    expect(versions.map((l) => l.textContent)).toEqual([
      'Version 3 · latest',
      'Version 2',
      'Version 1',
    ]);

    await user.click(screen.getByRole('link', { name: 'Version 2' }));
    expect(await screen.findByText('Notes of v2')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/menus/d3');
    expect(router.state.location.search).toBe('?version=2');
    expect(screen.getByRole('link', { name: 'Version 2' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('combobox')).toHaveValue('v2');

    // The select in the menu keeps the side list in step.
    await user.selectOptions(screen.getByRole('combobox'), 'v1');
    expect(await screen.findByText('Notes of v1')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?version=1');
    expect(screen.getByRole('link', { name: 'Version 1' })).toHaveAttribute('aria-current', 'true');
  });

  it('shows the versions of the open draft without a click', async () => {
    serve([], [draftMenu(2)]);
    server.use(
      http.get(api('/menus/d2'), () =>
        HttpResponse.json(
          buildMenu({
            id: 'd2',
            title: 'Draft 2',
            versions: [2, 1].map((n) => buildMenuVersion({ id: `v${n}`, versionNumber: n })),
          }),
        ),
      ),
    );
    renderRoutes(routes, '/menus/d2');

    expect(await screen.findByRole('button', { name: 'Versions of Draft 2' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: /^Version 2/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('shows 5 menus per group and the rest on request', async () => {
    const confirmed = Array.from({ length: 7 }, (_, i) => confirmedMenu(i + 1, 20 - i));
    serve(confirmed, []);
    const { user } = renderRoutes(routes, '/menus');

    expect(await screen.findByRole('link', { name: /Confirmed 5/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Confirmed 6/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show all (7)' }));
    expect(screen.getByRole('link', { name: /Confirmed 7/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByRole('link', { name: /Confirmed 7/ })).not.toBeInTheDocument();
  });

  it('keeps a selected menu beyond the first 5 visible', async () => {
    const confirmed = Array.from({ length: 7 }, (_, i) => confirmedMenu(i + 1, 20 - i));
    serve(confirmed, []);
    renderRoutes(routes, '/menus/c7');

    expect(await screen.findByRole('link', { name: /Confirmed 7/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument();
  });

  it('sends to the chat when there is no confirmed menu', async () => {
    serve([], []);
    renderRoutes(routes, '/menus');

    expect(await screen.findByText('No active menu yet')).toBeInTheDocument();
    expect(screen.getByText(/Ask the assistant in Chat/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Chat' })).toHaveAttribute('href', '/chat');
    expect(screen.getByText('No confirmed menus yet.')).toBeInTheDocument();
    expect(screen.getByText('No draft menus.')).toBeInTheDocument();
  });

  it('asks to confirm a draft when there are only drafts', async () => {
    serve([], [draftMenu(1)]);
    renderRoutes(routes, '/menus');

    expect(
      await screen.findByText(/Open a draft and confirm one of its versions/),
    ).toBeInTheDocument();
  });

  it('shows an error in the group and retries', async () => {
    let calls = 0;
    server.use(
      http.get(api('/menus'), ({ request }) => {
        if (new URL(request.url).searchParams.get('status') === 'draft') {
          return HttpResponse.json([]);
        }
        calls += 1;
        return calls === 1 ? apiError(500, 'Server is down') : HttpResponse.json([]);
      }),
    );
    const { user } = renderRoutes(routes, '/menus');

    expect(await screen.findByRole('alert')).toHaveTextContent('Server is down');
    expect(screen.queryByText('No active menu yet')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('No active menu yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  describe('a confirmed menu with newer versions', () => {
    const confirmedWithDrafts = () => {
      serve([{ ...confirmedMenu(1, 3), versionCount: 3 }], []);
      server.use(
        http.get(api('/menus/c1'), () =>
          HttpResponse.json(
            buildMenu({
              id: 'c1',
              title: 'Confirmed 1',
              confirmedVersionId: 'v2',
              confirmedAt: '2026-10-03T10:00:00.000Z',
              versions: [3, 2, 1].map((n) =>
                buildMenuVersion({
                  id: `v${n}`,
                  versionNumber: n,
                  isConfirmed: n === 2,
                  notes: `Notes of v${n}`,
                }),
              ),
            }),
          ),
        ),
      );
    };

    it('lists its versions and opens the confirmed one', async () => {
      confirmedWithDrafts();
      renderRoutes(routes, '/menus');

      expect(await screen.findByText('Notes of v2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Versions of Confirmed 1' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      const shown = await screen.findByRole('link', { current: true });
      expect(shown).toHaveTextContent('Version 2 · confirmed');
      expect(screen.getByRole('combobox')).toHaveValue('v2');
    });

    it('marks the version the details show when the requested one does not exist', async () => {
      confirmedWithDrafts();
      renderRoutes(routes, '/menus/c1?version=9');

      expect(await screen.findByText('Notes of v2')).toBeInTheDocument();
      expect(await screen.findByRole('link', { current: true })).toHaveTextContent('Version 2');
      expect(screen.getAllByRole('link', { current: true })).toHaveLength(1);
    });
  });

  it('deletes the open menu without loading it again', async () => {
    let deleted = false;
    let detailCalls = 0;
    server.use(
      http.get(api('/menus'), ({ request }) => {
        const status = new URL(request.url).searchParams.get('status');
        return HttpResponse.json(status === 'draft' && !deleted ? [draftMenu(1)] : []);
      }),
      http.get(api('/menus/d1'), () => {
        detailCalls += 1;
        return deleted
          ? apiError(404, 'Menu not found')
          : HttpResponse.json(buildMenu({ id: 'd1', title: 'Draft 1' }));
      }),
      http.delete(api('/menus/d1'), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, router } = renderRoutes(routes, '/menus/d1');

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this menu?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('No active menu yet')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/menus');
    expect(screen.queryByText('Menu not found')).not.toBeInTheDocument();
    expect(detailCalls).toBe(1);
  });

  it('deletes the active menu without loading it again', async () => {
    let deleted = false;
    let detailCalls = 0;
    server.use(
      http.get(api('/menus'), ({ request }) => {
        const status = new URL(request.url).searchParams.get('status');
        return HttpResponse.json(status === 'confirmed' && !deleted ? [confirmedMenu(1, 3)] : []);
      }),
      http.get(api('/menus/c1'), () => {
        detailCalls += 1;
        return deleted
          ? apiError(404, 'Menu not found')
          : HttpResponse.json(buildMenu({ id: 'c1', title: 'Confirmed 1' }));
      }),
      http.delete(api('/menus/c1'), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    // `/menus` opens the active menu; deleting it must not open it again from the old list.
    const { user } = renderRoutes(routes, '/menus');

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this menu?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('No active menu yet')).toBeInTheDocument();
    expect(screen.queryByText('Menu not found')).not.toBeInTheDocument();
    expect(detailCalls).toBe(1);
  });
});

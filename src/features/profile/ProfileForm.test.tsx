import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildProfile } from '../../test/fixtures';
import { createQueryWrapper } from '../../test/query-wrapper';
import { api, http, HttpResponse, server } from '../../test/server';
import { profileKeys, useProfile } from './profile.queries';
import { ProfileForm } from './ProfileForm';

function FormWithProfile() {
  const profile = useProfile();
  return profile.data === undefined ? null : <ProfileForm profile={profile.data} />;
}

const NEWER = '2026-11-01T10:00:00.000Z';

describe('ProfileForm', () => {
  it('shows newer server data that arrives after mounting from the cache', async () => {
    server.use(
      http.get(api('/profile'), () =>
        HttpResponse.json(buildProfile({ age: 31, weightKg: 70, updatedAt: NEWER })),
      ),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    queryClient.setQueryData(profileKeys.profile, buildProfile({ age: 30 }));
    render(<FormWithProfile />, { wrapper });

    // The stale cached profile first, then the refetched one.
    await vi.waitFor(() => expect(screen.getByLabelText('Age, years')).toHaveValue('31'));
    expect(screen.getByLabelText('Weight, kg')).toHaveValue('70');
  });

  it('keeps what the user changed when newer data arrives', async () => {
    const { wrapper } = createQueryWrapper();
    const { rerender } = render(<ProfileForm profile={buildProfile({ age: 30 })} />, { wrapper });
    const user = userEvent.setup();

    const height = screen.getByLabelText('Height, cm');
    await user.clear(height);
    await user.type(height, '175');
    rerender(<ProfileForm profile={buildProfile({ age: 31, heightCm: 170, updatedAt: NEWER })} />);

    expect(screen.getByLabelText('Age, years')).toHaveValue('31');
    expect(height).toHaveValue('175');
  });
});

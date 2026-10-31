import type { ReactNode, SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { size?: number };

/** A decorative 24×24 stroke icon; give the control around it the accessible name. */
function Icon({ size = 16, children, ...rest }: Props & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const BowlIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M6 13h12a6 6 0 0 1-6 6 6 6 0 0 1-6-6z" />
    <path d="M9 9c0-2 2-2 2-4M13 9c0-2 2-2 2-4" />
  </Icon>
);

export const CloseIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const PlusIcon = (props: Props) => (
  <Icon strokeWidth={2.4} {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const SendIcon = (props: Props) => (
  <Icon strokeWidth={2.2} {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const StopIcon = (props: Props) => (
  <Icon {...props}>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
  </Icon>
);

export const TrashIcon = (props: Props) => (
  <Icon strokeWidth={1.9} {...props}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Icon>
);

export const CalendarIcon = (props: Props) => (
  <Icon strokeWidth={1.8} {...props}>
    <rect x="4" y="5" width="16" height="15" rx="3" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Icon>
);

export const ChevronIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);

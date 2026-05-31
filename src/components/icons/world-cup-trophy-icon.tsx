import type { SVGProps } from "react";

export function WorldCupTrophyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="VM-trofé" {...props}>
      <path
        d="M21 11h22l-3 24c-.7 5.6-4 9.9-8 11.4-4-1.5-7.3-5.8-8-11.4L21 11Z"
        fill="#f4c95d"
      />
      <path
        d="M25 15c2.2 2.9 5 4.4 8.3 4.4 3 0 5.5-1.2 7.7-3.6l-2.4 18.4c-.5 4.1-2.8 7.3-6.6 9.1-3.8-1.8-6.1-5-6.6-9.1L23.7 21c1.5.6 3 .9 4.6.9 2.5 0 4.8-.8 6.7-2.3"
        fill="#d99a24"
        opacity=".72"
      />
      <path
        d="M20.8 16.2c-5.5.7-9.3 4.8-9.3 10.1 0 5.7 4.8 10.3 11.7 11"
        fill="none"
        stroke="#f4c95d"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path
        d="M43.2 16.2c5.5.7 9.3 4.8 9.3 10.1 0 5.7-4.8 10.3-11.7 11"
        fill="none"
        stroke="#f4c95d"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path d="M28 45h8l1.4 7h-10.8L28 45Z" fill="#7f1d1d" />
      <path d="M21 52h22l3 7H18l3-7Z" fill="#17130f" />
      <path d="M24 56h16" stroke="#f4c95d" strokeLinecap="round" strokeWidth="2" />
      <path
        d="M24 11h16M32 20v22M24.5 23.5c4.4 2.8 10.6 2.8 15 0"
        fill="none"
        stroke="#fff3bf"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

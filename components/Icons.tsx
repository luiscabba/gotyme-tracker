type P = { size?: number };
const S = ({ size = 20, children, sw = 1.8 }: P & { children: React.ReactNode; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
export const IconToday = (p: P) => <S {...p}><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></S>;
export const IconPath = (p: P) => <S {...p}><path d="M4 6h10M4 12h16M4 18h7" /></S>;
export const IconClock = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></S>;
export const IconWork = (p: P) => <S {...p}><path d="M4 7h16v12H4z" /><path d="M9 7V4.5h6V7" /></S>;
export const IconCheck = ({ size = 14 }: P) => <S size={size} sw={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></S>;
export const IconBack = ({ size = 16 }: P) => <S size={size} sw={2.2}><path d="M15 5l-7 7 7 7" /></S>;
export const IconNext = ({ size = 16 }: P) => <S size={size} sw={2.2}><path d="M9 5l7 7-7 7" /></S>;
export const IconPlus = ({ size = 18 }: P) => <S size={size} sw={2.2}><path d="M12 5v14M5 12h14" /></S>;
export const IconGear = ({ size = 18 }: P) => <S size={size}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /></S>;
export const IconFolder = ({ size = 18 }: P) => <S size={size}><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /></S>;
export const IconClip = ({ size = 16 }: P) => <S size={size}><path d="M8 12.5l5.5-5.5a3 3 0 0 1 4.2 4.2l-7 7a4.5 4.5 0 0 1-6.4-6.4L11 5" /></S>;
export const IconMail = ({ size = 16 }: P) => <S size={size}><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M4 7l8 6 8-6" /></S>;
export const IconEdit = ({ size = 18 }: P) => <S size={size}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></S>;

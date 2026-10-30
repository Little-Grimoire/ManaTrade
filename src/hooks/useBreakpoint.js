import { useWindowDimensions } from 'react-native';

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  const breakpoint = width < 768 ? 'mobile' : width < 1200 ? 'tablet' : 'desktop';
  return {
    width,
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isWide: breakpoint !== 'mobile',
    columns: width < 768 ? 2 : width < 1200 ? 4 : 6,
  };
}

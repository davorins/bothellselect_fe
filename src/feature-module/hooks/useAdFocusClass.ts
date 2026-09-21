import { useEffect } from 'react';

export function useAdFocusClass(className: string, active: boolean) {
  useEffect(() => {
    document.body.classList.toggle(className, active);
    return () => {
      document.body.classList.remove(className);
    };
  }, [className, active]);
}

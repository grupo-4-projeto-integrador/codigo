import { useState, useEffect } from 'react';

export function useCountUp(endValue: number, duration: number = 800): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percent = Math.min(progress / duration, 1);
      
      // Easing function (easeOutQuart for a snappy then smooth stop)
      const easeOut = 1 - Math.pow(1 - percent, 4);
      
      setValue(endValue * easeOut);

      if (percent < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setValue(endValue); // Ensure it perfectly reaches the end value
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [endValue, duration]);

  return value;
}

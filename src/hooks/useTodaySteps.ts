import { useEffect, useState } from 'react';
import { subscribeTodaySteps } from '@/services/stepTracker';

export function useTodaySteps(): number {
  const [steps, setSteps] = useState(0);

  useEffect(() => subscribeTodaySteps(setSteps), []);

  return steps;
}

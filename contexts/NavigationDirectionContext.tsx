import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { usePathname } from 'expo-router';

const TAB_ORDER = [
  '/(home)',
  '/search',
  '/notifications',
  '/profile',
];

function getTabIndex(pathname: string): number {
  if (pathname === '/' || pathname.includes('/(home)')) {
    return 0;
  }
  for (let i = 0; i < TAB_ORDER.length; i++) {
    if (pathname.includes(TAB_ORDER[i])) {
      return i;
    }
  }
  return -1;
}

interface NavigationDirectionContextType {
  direction: 'left' | 'right' | 'none';
  previousTabIndex: number;
  currentTabIndex: number;
}

const NavigationDirectionContext = createContext<NavigationDirectionContextType>({
  direction: 'none',
  previousTabIndex: 0,
  currentTabIndex: 0,
});

export function NavigationDirectionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousTabIndexRef = useRef<number>(0);
  const [direction, setDirection] = useState<'left' | 'right' | 'none'>('none');
  const [previousTabIndex, setPreviousTabIndex] = useState(0);
  const [currentTabIndex, setCurrentTabIndex] = useState(0);

  useEffect(() => {
    const newTabIndex = getTabIndex(pathname);
    
    if (newTabIndex >= 0 && newTabIndex !== previousTabIndexRef.current) {
      const prevIndex = previousTabIndexRef.current;
      
      if (newTabIndex > prevIndex) {
        setDirection('right');
      } else if (newTabIndex < prevIndex) {
        setDirection('left');
      } else {
        setDirection('none');
      }
      
      setPreviousTabIndex(prevIndex);
      setCurrentTabIndex(newTabIndex);
      previousTabIndexRef.current = newTabIndex;
    }
  }, [pathname]);

  return (
    <NavigationDirectionContext.Provider value={{ direction, previousTabIndex, currentTabIndex }}>
      {children}
    </NavigationDirectionContext.Provider>
  );
}

export function useNavigationDirection() {
  return useContext(NavigationDirectionContext);
}

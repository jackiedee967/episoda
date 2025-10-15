
import React from 'react';
import { Tabs } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';

export default function TabLayout() {
  const tabs = [
    { name: 'Home', icon: 'house.fill', route: '/(home)' },
    { name: 'Search', icon: 'magnifyingglass', route: '/search' },
    { name: 'Activity', icon: 'heart.fill', route: '/activity' },
    { name: 'Profile', icon: 'person.fill', route: '/profile' },
  ];

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="(home)" options={{ headerShown: false }} />
        <Tabs.Screen name="search" options={{ headerShown: false }} />
        <Tabs.Screen name="profile" options={{ headerShown: false }} />
      </Tabs>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}

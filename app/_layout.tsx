import { Stack, Link } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { runMigrations } from '@/db/migrate';
import { startStepTracker } from '@/services/stepTracker';

export default function RootLayout() {
  useEffect(() => {
    runMigrations();
    void startStepTracker();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#f8fafc',
          contentStyle: { backgroundColor: '#0f172a' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Health',
            headerRight: () => (
              <Link href="/settings">
                <Text style={{ color: '#60a5fa', fontSize: 22, paddingHorizontal: 8 }}>⚙</Text>
              </Link>
            ),
          }}
        />
        <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

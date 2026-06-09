import { View, StyleSheet } from 'react-native';
import { Chat } from '@/components/Chat';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Chat />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

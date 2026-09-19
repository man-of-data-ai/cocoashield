import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { authClient } from '../auth/client';

export function SignInPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error: failure } = await authClient.signIn.email({ email, password });
    if (failure) setError(failure.message ?? 'Connexion impossible.');
    setBusy(false);
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Connexion</Text>
      <TextInput
        style={styles.input}
        placeholder="Adresse email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable
        style={[styles.button, (busy || !email || !password) && styles.buttonDisabled]}
        onPress={signIn}
        disabled={busy || !email || !password}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Se connecter</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', gap: 10, paddingVertical: 12 },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  input: {
    borderWidth: 1,
    borderColor: '#D5DED0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  error: { color: '#B91C1C', fontSize: 13 },
  button: {
    backgroundColor: '#56773F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});

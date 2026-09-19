import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { authClient } from '../auth/client';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error: failure } = await authClient.signIn.email({
      email: email.trim(),
      password,
    });
    if (failure) {
      setError(
        failure.status === 401
          ? 'Adresse email ou mot de passe incorrect.'
          : (failure.message ?? 'Connexion impossible. Verifiez le reseau.'),
      );
    }
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>🌱 CocoaShield</Text>
          <Text style={styles.tagline}>Detection precoce du CSSVD</Text>

          <View style={styles.card}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>
              Connectez-vous pour envoyer vos observations a la plateforme.
            </Text>

            <Text style={styles.label}>Adresse email</Text>
            <TextInput
              style={styles.input}
              placeholder="agronome@exemple.ci"
              placeholderTextColor="#9AA79A"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              editable={!busy}
            />

            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9AA79A"
              secureTextEntry
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              editable={!busy}
              onSubmitEditing={() => canSubmit && signIn()}
              returnKeyType="go"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={signIn}
              disabled={!canSubmit}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Se connecter</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.footer}>
            L'analyse des feuilles fonctionne hors ligne. La connexion ne sert qu'a l'envoi.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9F7' },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { fontSize: 30, fontWeight: '800', textAlign: 'center', color: '#1F2937' },
  tagline: { fontSize: 14, color: '#667', textAlign: 'center', marginTop: 6, marginBottom: 28 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#56773F', marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#D5DED0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#FBFDF9',
    marginTop: 6,
  },
  error: { color: '#B91C1C', fontSize: 13, marginTop: 12 },
  button: {
    backgroundColor: '#56773F',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  footer: { fontSize: 12, color: '#8A948A', textAlign: 'center', marginTop: 24 },
});

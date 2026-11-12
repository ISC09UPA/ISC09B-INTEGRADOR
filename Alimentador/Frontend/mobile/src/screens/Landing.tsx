import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cargando, Logo, MarcaCirculo } from '@/components/Brand';
import { colors } from '@/theme';

/** Pantalla de arranque (mockup Landing) mientras cargan fuentes y sesión. */
export default function Landing() {
  return (
    <SafeAreaView style={styles.raiz}>
      <View style={styles.centro}>
        <MarcaCirculo size={265} />
        <Logo size={40} style={styles.logo} />
        <Cargando size={92} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.white },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  logo: { marginTop: 32, marginBottom: 36 },
});

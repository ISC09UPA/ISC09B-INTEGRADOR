import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// tabs: [{ id, label, icon }]
export default function BottomTabs({ tabs, active, onChange }) {
  return (
    <View style={styles.bar}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <Pressable key={t.id} style={styles.tab} onPress={() => onChange(t.id)}>
            <View style={[styles.pill, isActive && styles.pillActive]}>
              <Ionicons
                name={isActive ? t.icon : `${t.icon}-outline`}
                size={22}
                color={colors.green900}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: 18,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  pill: { paddingHorizontal: 18, paddingVertical: 4, borderRadius: 16 },
  pillActive: { backgroundColor: colors.green700 },
  label: { fontSize: 11, fontWeight: '600', color: colors.inkSoft },
  labelActive: { color: colors.green900, fontWeight: '800' },
});

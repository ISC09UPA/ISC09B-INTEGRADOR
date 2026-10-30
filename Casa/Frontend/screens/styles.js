import { StyleSheet } from 'react-native';

export const colors = {
  background: '#0a0e11',
  surface: '#11181d',
  border: '#253139',
  text: '#e8f0ee',
  muted: '#91a09f',
  green: '#34d399',
  red: '#fb7185',
  amber: '#fbbf24',
};

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 24,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  brandMark: {
    color: colors.green,
    fontSize: 34,
    fontWeight: '700',
  },
  brandName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  biometricBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 22,
  },
  biometricAccount: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
  removeSavedAccount: {
    alignSelf: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 28,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  flex: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  summaryCard: {
    flex: 1,
  },
  metric: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '700',
    marginTop: 10,
  },
  metricUnit: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '400',
  },
  bodyText: {
    color: colors.text,
    fontSize: 16,
  },
  mutedText: {
    color: colors.muted,
    fontSize: 14,
  },
  linkText: {
    color: colors.green,
    fontSize: 15,
    fontWeight: '600',
    padding: 8,
  },
  listItem: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
  },
  removeText: {
    color: colors.red,
    padding: 8,
  },
  addPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  personInput: {
    flex: 1,
    marginBottom: 0,
  },
  field: {
    marginTop: 18,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 18,
    marginTop: 14,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    marginTop: 0,
  },
  buttonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: colors.text,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressedButton: {
    opacity: 0.8,
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  errorBanner: {
    color: colors.red,
    backgroundColor: '#28161b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  footer: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
  },
});

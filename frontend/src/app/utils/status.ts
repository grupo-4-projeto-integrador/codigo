export const normalizeStatus = (value: string) => (value || '').trim().toUpperCase()

export const getStatusBadgeStyle = (status: string, colors: any) => {
  switch (normalizeStatus(status)) {
    case 'ATIVA':
      return { backgroundColor: '#e8f5ee', color: colors.forest, border: `1px solid ${colors.forest}4D` }
    case 'A VENCER':
      return { backgroundColor: '#fdf3e0', color: colors.olive, border: `1px solid ${colors.olive}4D` }
    case 'VENCIDA':
      return { backgroundColor: '#fdecea', color: colors.brandRed, border: `1px solid ${colors.brandRed}4D` }
    default:
      return {}
  }
}

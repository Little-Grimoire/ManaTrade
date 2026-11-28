// Estética de bestiário moderno: um livro de couro escuro e gasto, com detalhes em âmbar
// (olho de predador), ferrugem e musgo. Fontes modernas: Barlow Condensed nos títulos, Inter no texto.
export const theme = {
  colors: {
    // Páginas
    background: '#17130f', // couro escuro
    surface: '#221c16', // página (cartões, caixas)
    surfaceRaised: '#2d251d',
    input: '#1b1612',
    border: '#3e3328',
    // Texto
    text: '#f1e7d8',
    textMuted: '#a8988a',
    accent: '#e3a23b', // âmbar: links, destaques, item ativo
    onAccent: '#1a120a',
    gold: '#e3a23b', // marcas de garra e ornamentos
    // Botão principal: ferrugem/sangue seco
    primary: '#b4462a', primaryHover: '#963921', onPrimary: '#fbefe2',
    // Estados (greenStart/greenEnd mantidos como nome do "sucesso" por compatibilidade)
    success: '#8db255', greenStart: '#8db255', greenEnd: '#8db255',
    danger: '#e05a4a', warning: '#e8873a',
    // Lombada (barra de abas e barra lateral)
    leather: '#0f0c09', leatherRaised: '#241d16', leatherHover: '#2e251c', onLeather: '#a8988a', goldBright: '#e3a23b',
  },
  fonts: {
    title: 'BarlowCondensed_700Bold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_600SemiBold',
    bodyBold: 'Inter_700Bold',
    bodyItalic: 'Inter_400Regular_Italic',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 6, md: 10, lg: 14, pill: 999 },
  typography: { title: 32, h2: 24, h3: 18, body: 15, small: 13, weight: { regular: '400', medium: '600', bold: '800' } },
  shadow: { card: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 } },
};

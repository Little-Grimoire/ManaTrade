// Text e TextInput com as fontes do tema. O React Native não tem fonte padrão global,
// então as telas importam estes no lugar dos de 'react-native' (mesmas props).
// A fonte é escolhida pelo estilo que a tela já usa:
//   título (negrito e fontSize >= 18) → Barlow Condensed
//   corpo → Inter (regular, semi-negrito ou negrito conforme o fontWeight)
// O fontWeight é retirado: no Android, fonte própria + fontWeight cai na fonte do sistema.
import { createContext, forwardRef, useContext } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';
import { theme } from '../theme';

const DentroDeTexto = createContext(false);
const TAMANHO_PADRAO = theme.typography.body;

function familia(peso, tamanho, podeSerTitulo, italico) {
  const p = peso === 'bold' ? 700 : Number(peso) || 400;
  if (italico) return theme.fonts.bodyItalic;
  if (podeSerTitulo && p >= 700 && tamanho >= theme.typography.h3) return theme.fonts.title;
  if (p >= 700) return theme.fonts.bodyBold;
  if (p >= 500) return theme.fonts.bodyMedium;
  return theme.fonts.body;
}

function estiloComFonte(style, aninhado) {
  const plano = StyleSheet.flatten(style) || {};
  if (plano.fontFamily) return style;
  // Texto dentro de outro herda fonte e tamanho do pai; só muda se pedir outro peso.
  const italico = plano.fontStyle === 'italic';
  if (aninhado && plano.fontWeight === undefined && !italico) return style;
  const tamanho = plano.fontSize ?? (aninhado ? 0 : TAMANHO_PADRAO);
  return [style, {
    fontFamily: familia(plano.fontWeight, tamanho, !aninhado || plano.fontSize !== undefined, italico),
    fontWeight: undefined,
    fontStyle: undefined,
    ...(!aninhado && plano.fontSize === undefined && { fontSize: TAMANHO_PADRAO }),
  }];
}

export const Text = forwardRef(function Text({ style, ...props }, ref) {
  const aninhado = useContext(DentroDeTexto);
  return (
    <DentroDeTexto.Provider value>
      <RNText ref={ref} style={estiloComFonte(style, aninhado)} {...props} />
    </DentroDeTexto.Provider>
  );
});

export const TextInput = forwardRef(function TextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} placeholderTextColor={theme.colors.textMuted} style={estiloComFonte(style, false)} {...props} />;
});

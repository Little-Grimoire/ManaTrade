import { Image } from 'expo-image';
import { theme } from '../theme';

// Imagem de carta do Scryfall com cache em memória e em disco (o <Image> do React Native
// baixa de novo a cada tela no Android) e no tamanho certo para onde aparece:
//   "small"  146 × 204 px (~12 KB)  – miniaturas de lista
//   "normal" 488 × 680 px (~100 KB) – carta grande (detalhe, resultado do ManaScan)
// O backend guarda a URL "normal"; a "small" é o mesmo caminho com outro tamanho.
export function urlNoTamanho(url, tamanho = 'normal') {
  if (!url || !url.includes('cards.scryfall.io/')) return url;
  return url.replace(/cards\.scryfall\.io\/(small|normal|large|png|art_crop|border_crop)\//, `cards.scryfall.io/${tamanho}/`);
}

export default function ImagemCarta({ uri, tamanho = 'normal', style, contentFit = 'cover', accessibilityLabel }) {
  return (
    <Image
      source={{ uri: urlNoTamanho(uri, tamanho) }}
      style={[{ backgroundColor: theme.colors.background }, style]}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={150}
      recyclingKey={uri}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
  // API de ML (FastAPI em backend-ml/). No celular use o IP da máquina na rede local.
  mlApiUrl: process.env.EXPO_PUBLIC_ML_API_URL || 'http://localhost:8000',
};

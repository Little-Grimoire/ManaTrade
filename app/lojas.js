import Head from 'expo-router/head';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Mapa from '../src/components/Mapa';
import Cabecalho from '../src/components/Cabecalho';
import ChipFiltro from '../src/components/ChipFiltro';
import ListaItem from '../src/components/ListaItem';
import EstadoErro from '../src/components/EstadoErro';
import EstadoVazio from '../src/components/EstadoVazio';
import Skeleton from '../src/components/Skeleton';
import { getStores } from '../src/services/api';
import { theme } from '../src/theme';

export default function Lojas(){const [stores,setStores]=useState([]);const [status,setStatus]=useState('loading');const [view,setView]=useState('lista');const [location,setLocation]=useState(false);const load=async()=>{setStatus('loading');try{setStores(await getStores());setStatus('ready')}catch{setStatus('error')}};useEffect(()=>{load()},[]);if(status==='loading')return <View style={styles.page}><Skeleton height={260}/></View>;if(status==='error')return <EstadoErro onRetry={load}/>;
return <ScrollView contentContainerStyle={styles.page}><Head><title>Lojas próximas | ManaTrade</title></Head><Cabecalho title="Lojas próximas" back /><View style={styles.row}>{['lista','mapa'].map((item)=><ChipFiltro key={item} label={item==='lista'?'Lista':'Mapa'} active={view===item} onPress={()=>setView(item)} />)}</View>{location?<EstadoErro texto="Localização negada. Permita o acesso à localização nas configurações do navegador." onRetry={()=>setLocation(false)} />:view==='mapa'?<><Mapa stores={stores}/><View style={styles.row}>{stores.map((store)=><ChipFiltro key={store.id} label={store.name} onPress={()=>router.push(`/loja/${store.id}`)} />)}</View></>:stores.length?stores.map((store)=><ListaItem key={store.id} title={store.name} subtitle={`${store.hours} · ${store.games.join(', ')}`} meta={`${store.distance} ${store.consign?'· Consignação':''}`} onPress={()=>router.push(`/loja/${store.id}`)} />):<EstadoVazio titulo="Nenhuma loja próxima"/>}</ScrollView>;
}
const styles=StyleSheet.create({page:{flexGrow:1,maxWidth:1320,width:'100%',alignSelf:'center',padding:theme.spacing.lg},row:{flexDirection:'row',flexWrap:'wrap',gap:theme.spacing.sm,marginBottom:theme.spacing.lg}});

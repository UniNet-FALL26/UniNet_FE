import { Redirect, useLocalSearchParams } from 'expo-router';
export default function RetiredLevel1Screen() {
 const {id} = useLocalSearchParams<{id: string}>();
 return <Redirect href={{pathname: '/group/[id]', params: {id, tab: 'Tổng quan'}} as never} />;
}

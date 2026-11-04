import { Redirect } from 'expo-router';

/** Beyond the Label is built into the app now (Stack Check), so old links land there. */
export default function Btl() {
  return <Redirect href="/stack-check" />;
}

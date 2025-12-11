import { Reader } from '@contentauth/c2pa-node';

const path = '/Users/gpeacock/dev/c2pa-rs/target/images/CAICA.jpg';

try {
  const reader = await Reader.fromAsset({ 
    path,
    mimeType: 'image/jpeg'
  });
  console.log('Reader created:', !!reader);
  const json = reader.json();
  console.log('Manifest keys:', Object.keys(json));
  console.log('Has manifests:', 'manifests' in json);
  console.log('Has active_manifest:', 'active_manifest' in json);
} catch (err) {
  console.error('Error:', err.message);
}

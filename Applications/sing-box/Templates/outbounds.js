let config
try {
  config = JSON.parse($content ?? $files[0])
} catch (e) {
  throw new Error('配置文件不是合法的 JSON')
}
const COMPATIBLE_TAG = 'Block'

const SUBSCRIPTIONS = ['kt', 'lxy']

const REGIONS = [
  ['HK', /香港|Hong Kong(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
  ['JP', /日本|Japan(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
  ['KR', /韩国|Korea(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
  ['SG', /新加坡|Singapore(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
  ['US', /美国|America|United States(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
]

const REGION_GROUPS = new Set([
  'Global',
  'AI',
  'Google',
  'Microsoft',
  'Spotify',
  'TikTok',
  'X',
])

const allProxies = []
const regionOutbounds = []

for (const [index, name] of SUBSCRIPTIONS.entries()) {
  const proxies = await produceArtifact({
    name,
    type: 'subscription',
    platform: 'sing-box',
    produceType: 'internal',
  })

  allProxies.push(...proxies)

  for (const [region, regex] of REGIONS) {
    const tags = getTags(proxies, regex)

    if (!tags.length) continue

    regionOutbounds.push({
      tag: `${region}${String(index + 1).padStart(2, '0')}`,
      type: 'urltest',
      outbounds: tags,
    })
  }
}

regionOutbounds.sort((a, b) => a.tag.localeCompare(b.tag))


config.outbounds.push(
  ...allProxies,
  ...regionOutbounds,
)

const regionTags = getTags(regionOutbounds)

for (const outbound of config.outbounds) {
  if (!Array.isArray(outbound.outbounds)) continue

  if (outbound.tag === 'Select') {
    outbound.outbounds.unshift(...getTags(allProxies))
  } else if (REGION_GROUPS.has(outbound.tag)) {
    outbound.outbounds.unshift(...regionTags)
  }

  if (!outbound.outbounds.length) {
    outbound.outbounds.push(COMPATIBLE_TAG)
  }
}

$content = JSON.stringify(config, null, 2)

function getTags(items, regex) {
  return items
    .filter(({ tag }) => !regex || regex.test(tag))
    .map(({ tag }) => tag)
}
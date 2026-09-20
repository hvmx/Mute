let config
try {
  config = JSON.parse($content ?? $files[0])
} catch (e) {
  throw new Error('配置文件不是合法的 JSON')
}
const DIRECT_TAG = 'Direct'

const SUBSCRIPTIONS = ['kt', 'lxy']

const REGIONS = [
  ['HK', /香港|Hong Kong(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
  ['JP', /日本|Japan(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
  ['KR', /韩国|Korea(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
  ['SG', /新加坡|Singapore(?!.*\b(1\.\d+|[2-9]\d*)倍)/],
  ['US', /美国|America|United States(?!.*\b(1\.\d+|[2-9]\d*)倍)/]
]

const GROUPS = {
  Proxy: ['*', DIRECT_TAG],
  AI: ['*'],
  Games: ['*', DIRECT_TAG],
  Spotify: ['*', DIRECT_TAG],
  TikTok: ['JP'],
}

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

    if (tags.length) {
      regionOutbounds.push({
        tag: `${region}${String(index + 1).padStart(2, '0')}`,
        type: 'urltest',
        outbounds: tags,
      })
    }
  }
}

regionOutbounds.sort((a, b) => a.tag.localeCompare(b.tag))

const regionTags = getTags(regionOutbounds)

config.outbounds.push(...allProxies, ...regionOutbounds)

for (const [tag, group] of Object.entries(GROUPS)) {
  let outbound = config.outbounds.find(item => item.tag === tag)

  if (!outbound) {
    outbound = {
      tag,
      type: 'selector',
      outbounds: [],
    }
    config.outbounds.push(outbound)
  }

  outbound.outbounds = [
    ...new Set([
      ...getGroupTags(group),
      ...outbound.outbounds,
    ]),
  ]

  if (!outbound.outbounds.length) {
    outbound.outbounds.push(DIRECT_TAG)
  }
}

$content = JSON.stringify(config, null, 2)

function getTags(items, regex) {
  return items
    .filter(({ tag }) => !regex || regex.test(tag))
    .map(({ tag }) => tag)
}


function getGroupTags(group) {
  return group.flatMap(item => {
    if (item === '*') return regionTags
    if (item === DIRECT_TAG) return [DIRECT_TAG]

    return regionTags.filter(tag => tag.startsWith(item))
  })
}
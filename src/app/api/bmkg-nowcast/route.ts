import { NextResponse } from 'next/server'

interface BmkgNowcastItem {
  id: string
  title: string
  provinsi: string
  link: string
  description: string
  author: string
  pubDate: string
  event: string
  severity: string
  urgency: string
  certainty: string
  headline: string
  effective?: string
  expires?: string
  senderName: string
  source: string
}

function extractTag(xml: string, tag: string): string {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
  if (cdataMatch && cdataMatch[1]) return cdataMatch[1].trim()

  const standardMatch = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (standardMatch && standardMatch[1]) return standardMatch[1].trim()

  return ''
}

function extractItems(rssXml: string): BmkgNowcastItem[] {
  const items: BmkgNowcastItem[] = []
  const itemMatches = rssXml.match(/<item[\s\S]*?<\/item>/gi) || []

  itemMatches.forEach((itemXml, idx) => {
    const title = extractTag(itemXml, 'title')
    const link = extractTag(itemXml, 'link')
    const description = extractTag(itemXml, 'description')
    const author = extractTag(itemXml, 'author') || 'BMKG'
    const pubDate = extractTag(itemXml, 'pubDate')
    const guid = extractTag(itemXml, 'guid') || link

    // Extract province from title (e.g. "Peringatan Dini Cuaca Nusa Tenggara Timur")
    let provinsi = 'Nasional'
    const titleClean = title.replace(/^Peringatan\s+Dini\s+Cuaca\s+/i, '').trim()
    if (titleClean) {
      provinsi = titleClean.split(/Tgl|Tanggal|-|:/i)[0].trim()
    }

    const id = guid ? guid.split('/').pop()?.replace('.xml', '') || `bmkg-alert-${idx}` : `bmkg-alert-${idx}`

    items.push({
      id,
      title: title || 'Peringatan Dini Cuaca BMKG',
      provinsi: provinsi || 'Indonesia',
      link,
      description: description.replace(/<[^>]*>/g, '').trim(),
      author,
      pubDate,
      event: 'Peringatan Dini Cuaca Ekstrem',
      severity: 'Severe',
      urgency: 'Immediate',
      certainty: 'Observed',
      headline: title,
      senderName: author,
      source: 'BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)',
    })
  })

  return items
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const provinsiParam = searchParams.get('provinsi') || ''

  try {
    let nowcastList: BmkgNowcastItem[] = []

    // 1. Fetch live RSS XML feed from BMKG Official CAP Portal
    try {
      const bmkgRes = await fetch('https://www.bmkg.go.id/alerts/nowcast/id', {
        next: { revalidate: 60 },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SIPKK-EOC/1.0',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
      })

      if (bmkgRes.ok) {
        const xmlText = await bmkgRes.text()
        if (xmlText && xmlText.includes('<item')) {
          nowcastList = extractItems(xmlText)
        }
      }
    } catch (err) {
      console.warn('[BMKG Nowcast] RSS Fetch fallback:', err)
    }

    // 2. Secondary Fallback to API Indonesia Peringatan Dini if RSS is empty
    if (nowcastList.length === 0) {
      try {
        const apiKey = process.env.API_INDONESIA_KEY || 'aip_live_KmS4W3mHxXS4x6SV7Dh35QFHCKmT3Fts'
        const apiIndoRes = await fetch('https://use.apiindonesia.id/api/v1/peringatan-dini', {
          headers: { 'x-api-key': apiKey },
          next: { revalidate: 120 },
        })

        if (apiIndoRes.ok) {
          const apiJson = await apiIndoRes.json()
          const dataList = Array.isArray(apiJson?.data) ? apiJson.data : (apiJson ? [apiJson] : [])
          nowcastList = dataList
            .filter((d: any) => d.title || d.headline || d.description || d.detail || d.narasi)
            .map((d: any, idx: number) => ({
              id: d.id || `apiindo-${idx}`,
              title: d.title || d.headline || '',
              provinsi: d.provinsi || d.wilayah || '',
              link: d.link || d.url || '',
              description: (d.description || d.detail || d.narasi || '').replace(/<[^>]*>/g, '').trim(),
              author: 'BMKG',
              pubDate: d.pubDate || d.created_at || '',
              event: d.event || 'Peringatan Dini Cuaca',
              severity: d.severity || 'Moderate',
              urgency: d.urgency || 'Expected',
              certainty: d.certainty || 'Likely',
              headline: d.headline || d.title || '',
              senderName: 'BMKG',
              source: 'BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)',
            }))
        }
      } catch (err2) {
        console.warn('[BMKG Nowcast] API Indonesia Fallback error:', err2)
      }
    }

    // 3. Filter by province if requested
    let filteredList = nowcastList
    if (provinsiParam) {
      const pClean = provinsiParam.toLowerCase().replace(/[^a-z]/g, '')
      const matched = nowcastList.filter((item) => {
        const itemProv = item.provinsi.toLowerCase().replace(/[^a-z]/g, '')
        const itemTitle = item.title.toLowerCase().replace(/[^a-z]/g, '')
        const itemDesc = item.description.toLowerCase().replace(/[^a-z]/g, '')
        return itemProv.includes(pClean) || itemTitle.includes(pClean) || itemDesc.includes(pClean)
      })
      if (matched.length > 0) {
        filteredList = matched
      }
    }

    return NextResponse.json({
      success: true,
      data: filteredList,
      total: filteredList.length,
      sumber: 'BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) - Common Alerting Protocol (CAP)',
    })
  } catch (error: any) {
    console.error('[BMKG Nowcast API Error]:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch BMKG Nowcast alerts' },
      { status: 500 }
    )
  }
}

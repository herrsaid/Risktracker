'use server'

export async function fetchDeviceList() {
  try {
    const response = await fetch(
      'https://www.followmee.com/api/info.aspx?key=079379423eb798f20c1b56cb6ebfb56f&username=saidlam&function=devicelist',
      { cache: 'no-store' }
    )
    return await response.json()
  } catch (error) {
    console.error(error)
    return { error: 'Failed to fetch device list' }
  }
}

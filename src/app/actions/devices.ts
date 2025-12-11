'use server'

export async function fetchDevices() {
  try {
    const response = await fetch(
      'https://www.followmee.com/api/tracks.aspx?key=079379423eb798f20c1b56cb6ebfb56f&username=saidlam&output=json&function=currentforalldevices',
      { cache: 'no-store' }
    )
    return await response.json()
  } catch (error) {
    console.error(error)
    return { error: 'Failed to fetch' }
  }
}

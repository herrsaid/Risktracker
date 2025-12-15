type WhatsAppMessage = {
  to: string
  deviceName: string
  zoneName: string
  zoneType: "danger" | "alert"
  timestamp: string
}

export async function sendWhatsAppAlert(message: WhatsAppMessage) {
  const apiKey = process.env.INFOBIP_API_KEY
  const baseUrl = process.env.INFOBIP_BASE_URL
  const fromNumber = process.env.INFOBIP_SMS_FROM

  if (!apiKey || !baseUrl || !fromNumber) {
    console.error("Missing Infobip configuration")
    return { error: "SMS service not configured" }
  }

  // Remove leading + or 00 from phone number if present
  const cleanedPhone = message.to.replace(/^\+|^00/, "")

  // Format the alert message
  const alertText = `SAFETY ALERT\n\nDevice: ${message.deviceName}\nZone: ${message.zoneName}\nType: ${message.zoneType.toUpperCase()}\nTime: ${message.timestamp}\n\n${
    message.zoneType === "danger"
      ? "DANGER ZONE - Immediate action required!"
      : "ALERT ZONE - Caution advised"
  }`

  try {
    const response = await fetch(`${baseUrl}/sms/2/text/advanced`, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            destinations: [
              {
                to: cleanedPhone
              }
            ],
            from: fromNumber,
            text: alertText
          }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("SMS API error:", data)
      return { error: "Failed to send SMS message", details: data }
    }

    console.log("SMS message sent successfully:", data)
    return { success: true, data }
  } catch (error) {
    console.error("Error sending SMS message:", error)
    return { error: "Failed to send SMS message" }
  }
}

// Send text message
export async function sendWhatsAppTextMessage(to: string, text: string) {
  const apiKey = process.env.INFOBIP_API_KEY
  const baseUrl = process.env.INFOBIP_BASE_URL
  const fromNumber = process.env.INFOBIP_SMS_FROM

  if (!apiKey || !baseUrl || !fromNumber) {
    console.error("Missing Infobip configuration")
    return { error: "SMS service not configured" }
  }

  const cleanedPhone = to.replace(/^\+|^00/, "")

  try {
    const response = await fetch(`${baseUrl}/sms/2/text/advanced`, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            destinations: [
              {
                to: cleanedPhone
              }
            ],
            from: fromNumber,
            text: text
          }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("SMS API error:", data)
      return { error: "Failed to send SMS message", details: data }
    }

    console.log("SMS message sent successfully:", data)
    return { success: true, data }
  } catch (error) {
    console.error("Error sending SMS message:", error)
    return { error: "Failed to send SMS message" }
  }
}

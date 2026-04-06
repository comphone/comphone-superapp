// responses.js — LINE Template & Flex Message Generator
// สร้าง response templates สำหรับ LINE Bot

/**
 * สร้าง Job Report Card (LINE Flex Message)
 */
function createJobReportCard(jobData, photoUrl) {
  return {
    type: 'flex',
    altText: `📋 J${jobData.job_id} — ${jobData.customer}`,
    contents: {
      type: 'bubble',
      hero: photoUrl ? {
        type: 'image',
        url: photoUrl,
        size: 'full',
        aspectRatio: '16:9',
        aspectMode: 'cover'
      } : undefined,
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          // Job title
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: `#${jobData.job_id}`,
                weight: 'bold',
                size: 'xl',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: jobData.customer,
                weight: 'bold',
                size: 'xl',
                color: '#111111',
                margin: 'md'
              }
            ]
          },
          // Symptom
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '🔧 อาการ',
                size: 'sm',
                color: '#8c8c8c',
                weight: 'bold'
              },
              {
                type: 'text',
                text: jobData.symptom || '-',
                wrap: true,
                size: 'sm',
                color: '#666666'
              }
            ]
          },
          // Status
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: getStatusEmoji(jobData.status) + ' สถานะ',
                size: 'sm',
                color: '#8c8c8c',
                weight: 'bold'
              },
              {
                type: 'text',
                text: jobData.status,
                size: 'sm',
                color: '#1DB446',
                weight: 'bold',
                align: 'end'
              }
            ]
          },
          // Technician
          jobData.technician ? {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '👷 ช่าง',
                size: 'sm',
                color: '#8c8c8c',
                weight: 'bold'
              },
              {
                type: 'text',
                text: jobData.technician,
                size: 'sm',
                color: '#666666',
                align: 'end'
              }
            ]
          } : undefined,
          // GPS
          jobData.gps ? {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '📍 พิกัด',
                size: 'sm',
                color: '#8c8c8c',
                weight: 'bold'
              },
              {
                type: 'text',
                text: `${jobData.gps.lat.toFixed(4)}, ${jobData.gps.lng.toFixed(4)}`,
                size: 'sm',
                color: '#666666',
                align: 'end'
              }
            ]
          } : undefined
        ].filter(Boolean)
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📁 เปิดโฟลเดอร์งาน',
              uri: jobData.folder_url || 'https://drive.google.com'
            }
          },
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'message',
              label: '📸 อัปเดตรูปเพิ่ม',
              text: `#อัปเดตรูป ${jobData.job_id}`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'message',
              label: '✅ ปิดงาน',
              text: `#ปิดงาน ${jobData.job_id}`
            }
          }
        ]
      }
    }
  };
}

/**
 * สร้าง Summary Card (งานวันนี้)
 */
function createTodaySummary(summaryData) {
  const jobsList = summaryData.jobs?.slice(0, 10).map(j => ({
    type: 'text',
    text: `${j.job_id} | ${j.customer} | ${getStatusEmoji(j.status)} ${j.status}`,
    size: 'sm',
    color: '#555555',
    margin: 'sm'
  })) || [];

  return {
    type: 'flex',
    altText: `📊 สรุปงานวันนี้ — ${summaryData.date}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          // Header
          {
            type: 'text',
            text: '📊 สรุปงานวันนี้',
            weight: 'bold',
            size: 'xl',
            color: '#111111'
          },
          {
            type: 'text',
            text: summaryData.date || new Date().toLocaleDateString('th-TH'),
            size: 'sm',
            color: '#8c8c8c',
            margin: 'sm'
          },
          // Stats
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  { type: 'text', text: String(summaryData.total || 0), size: 'xxl', weight: 'bold', color: '#1DB446', align: 'center' },
                  { type: 'text', text: 'ทั้งหมด', size: 'xs', color: '#8c8c8c', align: 'center' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  { type: 'text', text: String(summaryData.pending || 0), size: 'xxl', weight: 'bold', color: '#FFB800', align: 'center' },
                  { type: 'text', text: 'รอดำเนินการ', size: 'xs', color: '#8c8c8c', align: 'center' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  { type: 'text', text: String(summaryData.inProgress || 0), size: 'xxl', weight: 'bold', color: '#1E90FF', align: 'center' },
                  { type: 'text', text: 'กำลังทำ', size: 'xs', color: '#8c8c8c', align: 'center' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  { type: 'text', text: String(summaryData.completed || 0), size: 'xxl', weight: 'bold', color: '#1DB446', align: 'center' },
                  { type: 'text', text: 'เสร็จแล้ว', size: 'xs', color: '#8c8c8c', align: 'center' }
                ]
              }
            ]
          },
          // Job list
          jobsList.length > 0 ? {
            type: 'separator',
            margin: 'lg'
          } : undefined,
          ...jobsList
        ].filter(Boolean)
      }
    }
  };
}

/**
 * สร้าง Stock Alert Card
 */
function createStockAlertCard(items) {
  const alerts = items.filter(i => i.qty < 5);
  const contents = alerts.map(i => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: '🔴', size: 'sm' },
      { type: 'text', text: i.name, size: 'sm', color: '#111111', flex: 0, margin: 'md' },
      { type: 'text', text: `${i.qty} ชิ้น`, size: 'sm', color: '#FF0000', weight: 'bold', align: 'end' }
    ],
    margin: 'sm'
  }));

  return {
    type: 'flex',
    altText: `⚠️ แจ้งเตือนสต๊อก — ${alerts.length} รายการ`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '⚠️ แจ้งเตือนสต๊อก', weight: 'bold', size: 'xl' },
          {
            type: 'text',
            text: `มี ${alerts.length} รายการใกล้หมดสต๊อก (<5 ชิ้น)`,
            size: 'sm',
            color: '#8c8c8c',
            margin: 'sm'
          },
          { type: 'separator', margin: 'lg' },
          ...contents
        ]
      }
    }
  };
}

/**
 * Quick Reply template
 */
function createQuickReply(jobId) {
  return {
    type: 'quick',
    items: [
      {
        type: 'action',
        action: {
          type: 'uri',
          label: '📍 ส่งพิกัด',
          uri: 'https://www.google.com/maps?q=my+location'
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '📸 อัปเดตรูป',
          text: `#อัปเดตรูป ${jobId}`
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '✅ ปิดงาน',
          text: `#ปิดงาน ${jobId}`
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '📁 โฟลเดอร์',
          text: `#โฟลเดอร์ ${jobId}`
        }
      }
    ]
  };
}

/**
 * Get status emoji
 */
function getStatusEmoji(status) {
  const map = {
    'รอดำเนินการ': '⏳',
    'InProgress': '🔄',
    'กำลังทำ': '🔄',
    'Completed': '✅',
    'เสร็จแล้ว': '✅',
    'ยกเลิก': '❌',
    'เลื่อน': '📅',
    'รออะไหล่': '⏸️',
    'Archived': '📦'
  };
  return map[status] || '📋';
}

module.exports = {
  createJobReportCard,
  createTodaySummary,
  createStockAlertCard,
  createQuickReply,
  getStatusEmoji
};

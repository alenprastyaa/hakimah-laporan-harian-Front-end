<script setup>
import { defineProps, computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  reports: {
    type: Array,
    required: true,
  },
  chartTitle: {
    type: String,
    default: 'Perkembangan Saldo Harian',
  },
})

const chartData = computed(() => {
  const dates = []
  const balances = []
  const profits = []

  // Group reports by date to sum up balances and profits for each day
  const dailyData = props.reports.reduce((acc, report) => {
    const date = report.report_date // Assuming report_date is in 'YYYY-MM-DD'
    if (!acc[date]) {
      acc[date] = { totalBalance: 0, totalProfit: 0 }
    }
    acc[date].totalBalance += report.total_balance || 0
    acc[date].totalProfit += report.profit_today || 0
    return acc
  }, {})

  // Sort dates for chronological order
  const sortedDates = Object.keys(dailyData).sort()

  sortedDates.forEach((date) => {
    dates.push(date)
    balances.push(dailyData[date].totalBalance)
    profits.push(dailyData[date].totalProfit)
  })

  return {
    labels: dates,
    datasets: [
      {
        label: 'Total Saldo Harian',
        backgroundColor: '#4A90E2', // Blue
        data: balances,
        yAxisID: 'y-balance',
      },
      {
        label: 'Keuntungan Harian',
        backgroundColor: '#7ED321', // Green
        data: profits,
        yAxisID: 'y-profit',
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: {
      display: true,
      text: props.chartTitle,
      font: {
        size: 18,
      },
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: function (context) {
          let label = context.dataset.label || ''
          if (label) {
            label += ': '
          }
          if (context.parsed.y !== null) {
            label += new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(context.parsed.y)
          }
          return label
        },
      },
    },
  },
  scales: {
    'y-balance': {
      type: 'linear',
      display: true,
      position: 'left',
      title: {
        display: true,
        text: 'Total Saldo',
      },
      ticks: {
        callback: function (value, index, values) {
          return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)
        },
      },
    },
    'y-profit': {
      type: 'linear',
      display: true,
      position: 'right',
      grid: {
        drawOnChartArea: false, // Only draw grid lines for the first y-axis
      },
      title: {
        display: true,
        text: 'Keuntungan Harian',
      },
      ticks: {
        callback: function (value, index, values) {
          return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)
        },
      },
    },
  },
}))
</script>

<template>
  <Bar :data="chartData" :options="chartOptions" />
</template>

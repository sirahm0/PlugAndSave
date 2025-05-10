// Report functionality
import { supabase } from './config.js'
import { showPopup } from './utils.js'

let consumptionChart = null, deviceComparisonChart = null, usageComparisonChart = null;

// Global flag to prevent multiple simultaneous PDF generations
let isPDFGenerating = false;

// Global counter to track how many times PDF generation is triggered
let pdfGenerationCounter = 0;

// Function to switch tabs - optimized
function switchTab(period) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    window.demoConsumptionData ? updateChartWithDemoData(period) : updateConsumptionChart(period);
}

// Initialize charts - optimized
async function initCharts() {
    // Get elements and hide them initially
    const canvasIds = ['consumptionChart', 'deviceComparisonChart', 'comparisonChart'];
    const canvasElements = canvasIds.map(id => document.getElementById(id));
    canvasElements.forEach(el => el && (el.style.display = 'none'));
    
    showNoDataMessages();
    
    // Common chart options
    const commonOptions = { responsive: true, maintainAspectRatio: false };
    
    // Initialize consumption chart
    if (canvasElements[0]) {
        consumptionChart = new Chart(canvasElements[0], {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Energy Consumption (kWh)',
                    data: [],
                    borderColor: '#4CAF50',
                    tension: 0.1
                }]
            },
            options: commonOptions
        });
    }
    
    // Initialize device comparison chart
    if (canvasElements[1]) {
        deviceComparisonChart = new Chart(canvasElements[1], {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Energy Usage (kWh)',
                    data: [],
                    backgroundColor: '#2196F3'
                }]
            },
            options: commonOptions
        });
    }
    
    // Initialize usage comparison chart
    if (canvasElements[2]) {
        usageComparisonChart = new Chart(canvasElements[2], {
            type: 'bar',
            data: {
                labels: ['Previous', 'Current'],
                datasets: [
                    { label: 'Daily Average', data: [0, 0], backgroundColor: '#4CAF50', borderWidth: 1 },
                    { label: 'Weekly Average', data: [0, 0], backgroundColor: '#2196F3', borderWidth: 1 },
                    { label: 'Monthly Average', data: [0, 0], backgroundColor: '#FFC107', borderWidth: 1 }
                ]
            },
            options: {
                ...commonOptions,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Energy Consumption (kWh)' } },
                    x: { title: { display: true, text: 'Time Period' } }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: context => `${context.dataset.label}: ${context.raw.toFixed(2)} kWh`
                        }
                    }
                }
            }
        });
    }
    
    // Load initial data
    await Promise.all([
        updateConsumptionChart('daily'),
        updateDeviceComparisonChart(),
        updateUsageComparison()
    ]);
}

async function updateConsumptionChart(period) {
    // Get user session and devices
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: devices, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', session.user.id);
    
    // Handle no data case
    const hasNoData = error || !devices || devices.length === 0 || !devices.some(d => d.monthly_usage > 0);
    const chartEl = document.getElementById('consumptionChart');
    const msgEl = document.getElementById('noDataMessage');
    
    if (hasNoData) {
        if (chartEl) chartEl.style.display = 'none';
        if (msgEl) msgEl.style.display = 'block';
        return;
    }
    
    // Show chart, hide message
    if (chartEl) chartEl.style.display = 'block';
    if (msgEl) msgEl.style.display = 'none';
    
    // Generate time period labels
    const now = new Date();
    let labels = [];
    
    switch(period) {
        case 'daily':
            // Last 7 days
            for(let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            }
            break;
        case 'weekly':
            // Last 4 weeks
            labels = Array.from({length: 4}, (_, i) => `Week ${4-i}`);
            break;
        case 'monthly':
            // Last 6 months
            for(let i = 5; i >= 0; i--) {
                const date = new Date(now);
                date.setMonth(date.getMonth() - i);
                labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
            }
            break;
    }
    
    // Calculate consumption data and update chart
    const data = labels.map(() => devices.reduce((sum, device) => 
        sum + (device.monthly_usage || 0) / labels.length, 0));
    
    if (consumptionChart) {
        consumptionChart.data.labels = labels;
        consumptionChart.data.datasets[0].data = data;
        consumptionChart.update();
    }
}

async function updateDeviceComparisonChart() {
    // Get user session and devices
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: devices, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', session.user.id);
    
    // Handle no data case
    const hasNoData = error || !devices || devices.length === 0 || !devices.some(d => d.monthly_usage > 0);
    const chartEl = document.getElementById('deviceComparisonChart');
    const msgEl = document.getElementById('noDeviceDataMessage');
    
    if (hasNoData) {
        if (chartEl) chartEl.style.display = 'none';
        if (msgEl) msgEl.style.display = 'block';
        return;
    }
    
    // Show chart, hide message
    if (chartEl) chartEl.style.display = 'block';
    if (msgEl) msgEl.style.display = 'none';
    
    // Filter devices with recorded usage
    const filteredDevices = devices.filter(d => d.monthly_usage > 0);
    const deviceNames = filteredDevices.map(d => d.name);
    const deviceUsage = filteredDevices.map(d => d.monthly_usage);
    
    // Update chart
    if (deviceComparisonChart) {
        deviceComparisonChart.data.labels = deviceNames;
        deviceComparisonChart.data.datasets[0].data = deviceUsage;
        deviceComparisonChart.update();
    }
}

async function loadReportData() {
    try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.log('No active session, redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        // Update report generation time
        const timeEl = document.getElementById('reportGenerationTime');
        if (timeEl) timeEl.textContent = new Date().toLocaleString();
        
        // Fetch devices for this user
        const { data: devices, error } = await supabase
            .from('devices')
            .select('*')
            .eq('user_id', session.user.id);
        
        if (error) {
            console.error('Error fetching devices:', error);
            showPopup('Error loading report data', false);
            return;
        }
        
        if (!devices || devices.length === 0) {
            console.log('No devices found for this user');
            updateSummaryWithNoDevices();
            return;
        }
        
        // Calculate totals
        const totalDevices = devices.length;
        const activeDevices = devices.filter(d => d.power_status).length;
        const totalMonthlyUsage = devices.reduce((sum, device) => sum + (parseFloat(device.monthly_usage) || 0), 0);
        
        // Calculate average electricity rate - default to 0.15 if not available
        const deviceRates = devices.filter(d => d.electricity_rate);
        const avgElectricityRate = deviceRates.length > 0 
            ? deviceRates.reduce((sum, d) => sum + parseFloat(d.electricity_rate), 0) / deviceRates.length 
            : 0.15;
        
        const totalMonthlyCost = totalMonthlyUsage * avgElectricityRate;
        
        // Update summary UI
        document.getElementById('totalDevices').textContent = totalDevices;
        document.getElementById('activeDevices').textContent = activeDevices;
        document.getElementById('totalMonthlyUsage').textContent = `${totalMonthlyUsage.toFixed(2)} kWh`;
        document.getElementById('totalMonthlyCost').textContent = `${totalMonthlyCost.toFixed(2)} SAR`;
        
        // Update device breakdown table
        const tableBody = document.getElementById('deviceBreakdownBody');
        if (tableBody) {
            tableBody.innerHTML = '';
            devices.forEach(device => {
                const monthlyUsage = parseFloat(device.monthly_usage) || 0;
                const electricityRate = parseFloat(device.electricity_rate) || avgElectricityRate;
                const monthlyCost = monthlyUsage * electricityRate;
                const potentialSavings = monthlyCost * 0.2;
                
                tableBody.appendChild(createTableRow(device, monthlyUsage, monthlyCost, potentialSavings));
            });
        }
        
        // Update savings analysis
        updateSavingsAnalysis(devices, avgElectricityRate);
        
        // Initialize charts
        initCharts();
    } catch (error) {
        console.error('Error loading report data:', error);
        showPopup('Error loading report data', false);
    }
}

// Helper function to create table row
function createTableRow(device, monthlyUsage, monthlyCost, potentialSavings) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${device.name || 'Unnamed Device'}</td>
        <td><span class="status-indicator ${device.power_status ? 'active' : 'inactive'}">${device.power_status ? 'Active' : 'Inactive'}</span></td>
        <td>${monthlyUsage.toFixed(2)} kWh</td>
        <td>${monthlyCost.toFixed(2)} SAR</td>
        <td>${potentialSavings.toFixed(2)} SAR</td>
    `;
    return row;
}

// Calculate and update savings analysis
function updateSavingsAnalysis(devices, avgElectricityRate) {
    try {
        const totalMonthlyUsage = devices.reduce((sum, device) => sum + (parseFloat(device.monthly_usage) || 0), 0);
        const potentialSavingsPercentage = 0.15;
        const potentialMonthlySavingsKwh = totalMonthlyUsage * potentialSavingsPercentage;
        const monthlySavingsCost = potentialMonthlySavingsKwh * avgElectricityRate;
        const annualSavingsCost = monthlySavingsCost * 12;
        
        // Update UI elements
        const savingsElements = {
            currentMonth: document.getElementById('currentMonthSavings'),
            annual: document.getElementById('projectedAnnualSavings')
        };
        
        if (savingsElements.currentMonth) 
            savingsElements.currentMonth.textContent = `${monthlySavingsCost.toFixed(2)} SAR`;
        if (savingsElements.annual) 
            savingsElements.annual.textContent = `${annualSavingsCost.toFixed(2)} SAR`;
    } catch (error) {
        console.error('Error updating savings analysis:', error);
    }
}

async function updateUsageComparison() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        // Fetch device data
        const { data: devices, error: deviceError } = await supabase
            .from('devices')
            .select('*')
            .eq('user_id', session.user.id);
        
        if (deviceError || !devices || devices.length === 0) {
            // Handle no data case
            const els = {
                chart: document.getElementById('comparisonChart'),
                noData: document.getElementById('noComparisonDataMessage')
            };
            
            if (els.chart) els.chart.style.display = 'none';
            if (els.noData) els.noData.style.display = 'block';
            
            // Reset stat cards
            ['daily', 'weekly', 'monthly'].forEach(period => {
                updateStatCard(`${period}Average`, `${period}Trend`, 0, 0);
            });
            return;
        }
        
        // Try to get usage data
        const { data: usageData, error: usageError } = await supabase
            .from('usage_data')
            .select('*')
            .eq('user_id', session.user.id)
            .order('date', { ascending: false })
            .limit(30);
        
        if (usageError) {
            console.error('Error fetching usage data:', usageError);
            // Fall back to calculated values
            const totalMonthlyUsage = devices.reduce((sum, device) => sum + (parseFloat(device.monthly_usage) || 0), 0);
            updateComparisonChart(totalMonthlyUsage / 30, totalMonthlyUsage / 4.3, totalMonthlyUsage);
            return;
        }
        
        // Process usage data if available
        if (usageData && usageData.length > 0) {
            // Calculate daily average
            const dailyTotal = usageData.reduce((sum, record) => sum + (parseFloat(record.daily_usage) || 0), 0);
            const currentDailyAvg = dailyTotal / usageData.length;
            
            // Group by week
            const weeklyData = {};
            usageData.forEach(record => {
                const weekNumber = getWeekNumber(new Date(record.date));
                if (!weeklyData[weekNumber]) weeklyData[weekNumber] = { total: 0, count: 0 };
                weeklyData[weekNumber].total += parseFloat(record.daily_usage) || 0;
                weeklyData[weekNumber].count++;
            });
            
            // Calculate weekly average
            const weeklyAverages = Object.values(weeklyData).map(week => week.total);
            const currentWeeklyAvg = weeklyAverages.length > 0 ? 
                weeklyAverages.reduce((sum, val) => sum + val, 0) / weeklyAverages.length : 0;
            
            // Group by month
            const monthlyData = {};
            usageData.forEach(record => {
                const month = new Date(record.date).getMonth();
                if (!monthlyData[month]) monthlyData[month] = 0;
                monthlyData[month] += parseFloat(record.daily_usage) || 0;
            });
            
            // Get most recent month total
            const currentMonthlyAvg = Object.values(monthlyData)[0] || 0;
            
            updateComparisonChart(currentDailyAvg, currentWeeklyAvg, currentMonthlyAvg);
        } else {
            // Fall back to calculated values from devices
            const totalMonthlyUsage = devices.reduce((sum, device) => sum + (parseFloat(device.monthly_usage) || 0), 0);
            updateComparisonChart(totalMonthlyUsage / 30, totalMonthlyUsage / 4.3, totalMonthlyUsage);
        }
    } catch (error) {
        console.error('Error updating usage comparison:', error);
    }
}

// Helper function to get week number from date
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Helper function to update comparison chart and stats
function updateComparisonChart(currentDailyAvg, currentWeeklyAvg, currentMonthlyAvg) {
    if (usageComparisonChart) {
        // Update chart data
        usageComparisonChart.data.datasets[0].data = [0, currentDailyAvg];
        usageComparisonChart.data.datasets[1].data = [0, currentWeeklyAvg];
        usageComparisonChart.data.datasets[2].data = [0, currentMonthlyAvg];
        usageComparisonChart.update();
        
        // Show chart and hide message
        const chartEl = document.getElementById('comparisonChart');
        const noDataMsg = document.getElementById('noComparisonDataMessage');
        if (chartEl) chartEl.style.display = 'block';
        if (noDataMsg) noDataMsg.style.display = 'none';
    }
    
    // Update the stats cards
    updateStatCard('dailyAverage', 'dailyTrend', currentDailyAvg, 0);
    updateStatCard('weeklyAverage', 'weeklyTrend', currentWeeklyAvg, 0);
    updateStatCard('monthlyAverage', 'monthlyTrend', currentMonthlyAvg, 0);
}

// Load demo data for both charts
function loadDemoData() {
    try {
        // Store the real data before changing to demo
        const realData = {
            monthlyUsage: document.getElementById('totalMonthlyUsage').textContent,
            monthlyCost: document.getElementById('totalMonthlyCost').textContent,
            totalDevices: document.getElementById('totalDevices').textContent,
            activeDevices: document.getElementById('activeDevices').textContent
        };
        
        // Generate random data for charts
        const periods = {
            daily: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                data: Array.from({ length: 7 }, () => Math.random() * 3 + 1) // 1-4 kWh per day
            },
            weekly: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                data: Array.from({ length: 4 }, () => Math.random() * 15 + 5) // 5-20 kWh per week
            },
            monthly: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                data: Array.from({ length: 6 }, () => Math.random() * 60 + 40) // 40-100 kWh per month
            }
        };
        
        // Save demo data for use in other functions
        window.demoConsumptionData = periods;
        
        // Update consumption chart with daily data
        if (consumptionChart) {
            consumptionChart.data.labels = periods.daily.labels;
            consumptionChart.data.datasets[0].data = periods.daily.data;
            consumptionChart.update();
            
            // Show chart and hide message
            const chartEl = document.getElementById('consumptionChart');
            const noDataMsg = document.getElementById('noDataMessage');
            if (chartEl) chartEl.style.display = 'block';
            if (noDataMsg) noDataMsg.style.display = 'none';
        }
        
        // Calculate statistics for comparison chart
        const avgData = {
            daily: periods.daily.data.reduce((sum, val) => sum + val, 0) / periods.daily.data.length,
            weekly: periods.weekly.data.reduce((sum, val) => sum + val, 0) / periods.weekly.data.length,
            monthly: periods.monthly.data.reduce((sum, val) => sum + val, 0) / periods.monthly.data.length
        };
        
        // Generate comparison data (15% higher in previous period)
        const prevData = {
            daily: avgData.daily * 1.15,
            weekly: avgData.weekly * 1.15,
            monthly: avgData.monthly * 1.15
        };
        
        // Calculate trends (negative means improvement)
        const trends = {
            daily: ((avgData.daily - prevData.daily) / prevData.daily) * 100,
            weekly: ((avgData.weekly - prevData.weekly) / prevData.weekly) * 100,
            monthly: ((avgData.monthly - prevData.monthly) / prevData.monthly) * 100
        };
        
        // Update comparison chart
        if (usageComparisonChart) {
            usageComparisonChart.data.datasets[0].data = [prevData.daily, avgData.daily];
            usageComparisonChart.data.datasets[1].data = [prevData.weekly, avgData.weekly];
            usageComparisonChart.data.datasets[2].data = [prevData.monthly, avgData.monthly];
            usageComparisonChart.update();
            
            // Show chart and hide message
            const chartEl = document.getElementById('comparisonChart');
            const noDataMsg = document.getElementById('noComparisonDataMessage');
            if (chartEl) chartEl.style.display = 'block';
            if (noDataMsg) noDataMsg.style.display = 'none';
        }
        
        // Update stat cards
        updateStatCard('dailyAverage', 'dailyTrend', avgData.daily, trends.daily);
        updateStatCard('weeklyAverage', 'weeklyTrend', avgData.weekly, trends.weekly);
        updateStatCard('monthlyAverage', 'monthlyTrend', avgData.monthly, trends.monthly);
        
        // Update savings analysis with demo data
        const avgRate = 0.15; // Default rate
        const savingsPercent = 0.15;
        const monthlySavingsKwh = avgData.monthly * savingsPercent;
        const monthlySavingsCost = monthlySavingsKwh * avgRate;
        const annualSavingsCost = monthlySavingsCost * 12;
        
        // Update savings UI
        const savingsEls = {
            monthly: document.getElementById('currentMonthSavings'),
            annual: document.getElementById('projectedAnnualSavings')
        };
        
        if (savingsEls.monthly) savingsEls.monthly.textContent = `${monthlySavingsCost.toFixed(2)} SAR`;
        if (savingsEls.annual) savingsEls.annual.textContent = `${annualSavingsCost.toFixed(2)} SAR`;
        
        // Restore real summary data
        document.getElementById('totalDevices').textContent = realData.totalDevices;
        document.getElementById('activeDevices').textContent = realData.activeDevices;
        document.getElementById('totalMonthlyUsage').textContent = realData.monthlyUsage;
        document.getElementById('totalMonthlyCost').textContent = realData.monthlyCost;
        
        // Show success message
        showPopup('Demo data loaded successfully!', true);
    } catch (error) {
        console.error('Error loading demo data:', error);
        showPopup('Failed to load demo data', false);
    }
}

// Update chart with demo data
function updateChartWithDemoData(period) {
    if (!window.demoConsumptionData || !consumptionChart) return;
    
    const data = window.demoConsumptionData[period];
    
    // Update chart and display
    consumptionChart.data.labels = data.labels;
    consumptionChart.data.datasets[0].data = data.data;
    consumptionChart.update();
    
    // Ensure chart is visible
    const chartEl = document.getElementById('consumptionChart');
    const noDataMsg = document.getElementById('noDataMessage');
    if (chartEl) chartEl.style.display = 'block';
    if (noDataMsg) noDataMsg.style.display = 'none';
}

// Helper function to update a stat card
function updateStatCard(valueId, trendId, value, trendPercentage) {
    const valueEl = document.getElementById(valueId);
    const trendEl = document.getElementById(trendId);
    
    if (valueEl) valueEl.textContent = `${value.toFixed(2)} kWh`;
    
    if (trendEl) {
        if (trendPercentage === 0) {
            trendEl.innerHTML = `<i class="fas fa-minus"></i> 0%`;
            trendEl.className = 'stat-trend';
        } else {
            const isNegative = trendPercentage < 0;
            const absPercentage = Math.abs(trendPercentage).toFixed(1);
            
            trendEl.innerHTML = `<i class="fas fa-arrow-${isNegative ? 'down' : 'up'}"></i> ${absPercentage}%`;
            trendEl.className = isNegative ? 'stat-trend' : 'stat-trend negative';
        }
    }
}

// Update summary when no devices are available
function updateSummaryWithNoDevices() {
    // Update summary statistics
    const elements = {
        totalDevices: document.getElementById('totalDevices'),
        activeDevices: document.getElementById('activeDevices'),
        totalMonthlyUsage: document.getElementById('totalMonthlyUsage'),
        totalMonthlyCost: document.getElementById('totalMonthlyCost')
    };

    if (elements.totalDevices) elements.totalDevices.textContent = '0';
    if (elements.activeDevices) elements.activeDevices.textContent = '0';
    if (elements.totalMonthlyUsage) elements.totalMonthlyUsage.textContent = '0.00 kW';
    if (elements.totalMonthlyCost) elements.totalMonthlyCost.textContent = '0.00 SAR';

    // Update device table with no data message
    const tbody = document.getElementById('deviceBreakdownBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="no-data">No devices found</td></tr>';
}

// Show "no data available" messages for all charts
function showNoDataMessages() {
    const messageIds = ['noDataMessage', 'noDeviceDataMessage', 'noComparisonDataMessage'];
    messageIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'block';
    });
}

// Generate and download PDF report
async function generatePDF() {
    // Prevent multiple calls
    if (isPDFGenerating) {
        console.log(`PDF generation already in progress (call #${++pdfGenerationCounter})`);
        return;
    }
    
    console.log(`Starting PDF generation (call #${++pdfGenerationCounter})`);
    isPDFGenerating = true;
    
    try {
        // Update UI to show loading state
        const downloadBtn = document.getElementById('downloadReportBtn');
        const originalBtnText = downloadBtn.textContent;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
        downloadBtn.disabled = true;
        
        // Force chart updates
        [consumptionChart, deviceComparisonChart, usageComparisonChart].forEach(chart => chart?.update());
        
        // Get report content and metadata
        const reportContent = document.querySelector('.dashboard-card');
        if (!reportContent) throw new Error('Report content not found');
        
        const reportTitle = 'Energy Report - Plug&Save';
        const reportDate = document.getElementById('reportGenerationTime')?.textContent || new Date().toLocaleDateString();
        
        // Wait for charts to render
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Capture report content as image
        const canvas = await html2canvas(reportContent, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: true,
            foreignObjectRendering: true,
            onclone: doc => {
                // Ensure charts are visible in cloned document
                doc.querySelectorAll('.chart-container').forEach(container => {
                    Object.assign(container.style, {
                        display: 'block',
                        height: '300px',
                        visibility: 'visible'
                    });
                });
                
                // Ensure canvas elements are visible
                doc.querySelectorAll('canvas').forEach(canvas => {
                    Object.assign(canvas.style, {
                        display: 'block',
                        height: '100%',
                        width: '100%',
                        visibility: 'visible',
                        maxHeight: 'none'
                    });
                });
                
                // Hide elements that shouldn't be in PDF
                const downloadBtnClone = doc.querySelector('#downloadReportBtn');
                if (downloadBtnClone) downloadBtnClone.style.display = 'none';
                
                // Hide any no-data messages
                doc.querySelectorAll('[id$="Message"]').forEach(msg => {
                    msg.style.display = 'none';
                });
            }
        });
        
        // Create PDF document
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Calculate dimensions
        const imgWidth = 190;
        const pageHeight = 280;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add title and metadata
        pdf.setFontSize(18);
        pdf.setTextColor(76, 175, 80);
        pdf.text(reportTitle, 10, 10);
        
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Generated on: ${reportDate}`, 10, 20);
        
        // Add the image to the first page
        pdf.addImage(canvas, 'PNG', 10, 30, imgWidth, imgHeight);
        
        // Add additional pages if needed
        let heightLeft = imgHeight - (pageHeight - 30);
        let pageCount = 1;
        
        while (heightLeft > 0) {
            pageCount++;
            pdf.addPage();
            
            // Calculate position for this page
            const position = -(pageHeight * (pageCount - 1)) + 30;
            
            pdf.addImage(canvas, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        // Generate filename with current date
        const today = new Date();
        const filename = `energy_report_${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.pdf`;
        
        // Save the PDF
        pdf.save(filename);
        
        // Reset UI
        downloadBtn.innerHTML = originalBtnText;
        downloadBtn.disabled = false;
        
        // Show success message
        showPopup('Report downloaded successfully', true);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showPopup('Failed to generate PDF. Please try again.', false);
        
        // Reset button state on error
        const downloadBtn = document.getElementById('downloadReportBtn');
        if (downloadBtn) {
            downloadBtn.textContent = 'Download Report';
            downloadBtn.disabled = false;
        }
    } finally {
        // Reset flag
        isPDFGenerating = false;
    }
}

// Setup event handlers for buttons and interface elements
function setupEventHandlers() {
    // Setup both buttons
    const buttonSetup = [
        { id: 'loadDemoDataBtn', handler: loadDemoData },
        { id: 'downloadReportBtn', handler: null } // Special handling for download button
    ];
    
    buttonSetup.forEach(btn => {
        const element = document.getElementById(btn.id);
        if (element && btn.handler) {
            element.addEventListener('click', btn.handler);
        }
    });
    
    // Special handling for download button to prevent duplicate calls
    const downloadBtn = document.getElementById('downloadReportBtn');
    if (downloadBtn) {
        // Replace with fresh node to remove any existing listeners
        const newBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);
        
        // Add single event listener
        newBtn.addEventListener('click', e => {
            e.preventDefault();
            console.log('Download button clicked, calling generatePDF()');
            generatePDF();
        });
    }
}

// Initialize report when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make switchTab function available globally
    window.switchTab = switchTab;
    
    // Check if user is logged in and initialize
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        
        // Load data and setup UI
        loadReportData();
        initCharts();
        setupEventHandlers();
    });
});

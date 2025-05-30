async function fetchRevenueData() {
    const response = await fetch('/api/admin/statistics/revenue');
    const data = await response.json();
    return data.data;
}

async function fetchOrderStatusData() {
    const response = await fetch('/api/admin/statistics/orders');
    const data = await response.json();
    return data.data;
}

async function fetchPopularServicesData() {
    const response = await fetch('/api/admin/statistics/popular-services');
    const data = await response.json();
    return data.data;
}

async function renderCharts() {
    // Doanh thu theo tháng
    const revenueData = await fetchRevenueData();
    const revenueLabels = revenueData.map(item => item.month);
    const revenueValues = revenueData.map(item => item.total_revenue);

    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: revenueLabels,
            datasets: [{
                label: 'Doanh Thu (VND)',
                data: revenueValues,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Doanh Thu Theo Tháng' }
            }
        }
    });

    // Số lượng đơn hàng theo trạng thái
    const orderStatusData = await fetchOrderStatusData();
    const orderStatusLabels = orderStatusData.map(item => item.status);
    const orderStatusValues = orderStatusData.map(item => item.total_orders);

    const orderStatusCtx = document.getElementById('orderStatusChart').getContext('2d');
    new Chart(orderStatusCtx, {
        type: 'pie',
        data: {
            labels: orderStatusLabels,
            datasets: [{
                label: 'Số Lượng Đơn Hàng',
                data: orderStatusValues,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Số Lượng Đơn Hàng Theo Trạng Thái' }
            }
        }
    });
}

async function renderPopularServicesChart() {
    const popularServicesData = await fetchPopularServicesData();
    const labels = popularServicesData.map(item => item.service_name);
    const values = popularServicesData.map(item => item.total_orders);

    const ctx = document.getElementById('popularServicesChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Số Lượng Đơn Hàng',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Dịch Vụ Phổ Biến' }
            }
        }
    });
}

// Gọi hàm renderCharts khi tải trang
renderCharts();
renderPopularServicesChart();
document.addEventListener('DOMContentLoaded', () => {
    const btnSolve = document.getElementById('btn-solve');
    const inputW = document.getElementById('capacity');
    const inputWeights = document.getElementById('weights');
    const inputValues = document.getElementById('values');
    
    const errorMsg = document.getElementById('error-message');
    const resValue = document.getElementById('res-max-value');
    const resItems = document.getElementById('res-items');
    
    const dpTable = document.getElementById('dp-table');
    const tableHead = dpTable.querySelector('thead');
    const tableBody = dpTable.querySelector('tbody');
    
    const spinner = btnSolve.querySelector('.spinner');
    const btnText = btnSolve.querySelector('.btn-text');

    // Hàm tiện ích: Ẩn/hiện thông báo lỗi
    const showError = (message) => {
        errorMsg.textContent = message;
        errorMsg.classList.remove('hidden');
    };

    const clearError = () => {
        errorMsg.classList.add('hidden');
        errorMsg.textContent = '';
    };

    // Hàm tiện ích: Trạng thái loading của nút
    const setLoading = (isLoading) => {
        btnSolve.disabled = isLoading;
        if (isLoading) {
            spinner.classList.remove('hidden');
            btnText.textContent = 'Đang Xử Lý...';
        } else {
            spinner.classList.add('hidden');
            btnText.textContent = 'Tính Toán & Lấy Lời Giải';
        }
    };

    // Hàm chính: Gọi API và render UI
    btnSolve.addEventListener('click', async () => {
        clearError();
        
        const wVal = inputW.value.trim();
        const weightsVal = inputWeights.value.trim();
        const valuesVal = inputValues.value.trim();
        
        // 1. Validate frontend cơ bản
        if (!wVal || !weightsVal || !valuesVal) {
            showError("Vui lòng nhập đầy đủ Sức chứa, Trọng lượng và Giá trị!");
            return;
        }

        try {
            setLoading(true);

            // 2. Fetch API POST tới Backend
            const response = await fetch('/api/solve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    W: wVal,
                    weights: weightsVal,
                    values: valuesVal
                })
            });

            const data = await response.json();

            // 3. Xử lý logic API trả về
            if (!data.success) {
                showError(data.message || "Đã xảy ra lỗi không xác định từ Backend.");
                setLoading(false);
                return;
            }

            // --- 4. Render Kết Quả Tổng Quan ---
            resValue.textContent = data.max_value; // Tổng lợi nhuận 
            
            if (data.selected_items && data.selected_items.length > 0) {
                resItems.textContent = data.selected_items.join(", ");
                resItems.style.color = '#10b981'; // Màu xanh lá
                resItems.style.fontWeight = 'bold';
            } else {
                resItems.textContent = "(Không lấy được vật nào phù hợp)";
                resItems.style.color = 'var(--text-muted)';
                resItems.style.fontWeight = 'normal';
            }

            // --- 5. Render Bảng Ma Trận Quy Hoạch Động với đường Highlight ---
            renderTable(data.dp_matrix, data.W, data.weights, data.values, data.selected_items, data.path_trace);

        } catch (error) {
            console.error("Lỗi Fetch:", error);
            showError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại dịch vụ Backend Python.");
        } finally {
            setLoading(false);
        }
    });

    // Hàm render động HTML DOM Table từ Mảng 2 Chiều DP
    function renderTable(dpMatrix, maxW, weightsArr, valuesArr, selectedItemsArr, pathTraceArray) {
        // Xóa sạch nội dung cũ
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        // TẠO HÀNG TIÊU ĐỀ TRÊN CÙNG (THEAD)
        const headerRow = document.createElement('tr');
        
        // Cột tĩnh đầu tiên
        const thFirst = document.createElement('th');
        thFirst.className = 'col-item';
        thFirst.innerHTML = 'i \\ j';
        headerRow.appendChild(thFirst);

        // Các cột dung tích từ 0 -> W
        for (let j = 0; j <= maxW; j++) {
            const th = document.createElement('th');
            th.textContent = `j=${j}`;
            headerRow.appendChild(th);
        }
        tableHead.appendChild(headerRow);

        // TẠO THÂN BẢNG (TBODY)
        // Lưu ý: data.weights và data.values là mảng bắt đầu từ index 0, tức là vật thứ i tương ứng với [i-1] trong mảng
        for (let i = 0; i < dpMatrix.length; i++) {
            const tr = document.createElement('tr');

            // --- Tạo cột chỉ định tên/trọng lượng vật ---
            const tdLabel = document.createElement('td');
            tdLabel.className = 'col-item-val';
            
            if (i === 0) {
                tdLabel.textContent = `i=0 (Base)`;
            } else {
                // Ví dụ hiển thị: i=1 (W: 10, Value: 60)
                const w = weightsArr[i - 1];
                const v = valuesArr[i - 1];
                tdLabel.textContent = `i=${i} (W:${w}, V:${v})`;
            }
            tr.appendChild(tdLabel);

            // --- Đổ dữ liệu các ô DP[i][j] ---
            const rowValues = dpMatrix[i];
            for (let j = 0; j < rowValues.length; j++) {
                const td = document.createElement('td');
                const cellValue = rowValues[j];
                td.textContent = cellValue;
                
                // Xác định nếu ô [i, j] hiện tại nằm trên đường Path Trace thì gắn class highlight
                let isPathNode = false;
                if (pathTraceArray) {
                     isPathNode = pathTraceArray.some(coord => coord[0] === i && coord[1] === j);
                }

                if (isPathNode) {
                    td.classList.add('cell-selected');
                }

                // --- Highlight ô tổng giá trị chung cuộc (Góc dưới cùng rẽ phải)
                if (i === dpMatrix.length - 1 && j === rowValues.length - 1) {
                    // Ưu tiên màu cực trị gốc của bảng nếu đúng là nút kết quả cuối
                    td.style.backgroundColor = '#fed7aa'; // Cam highlight cực trị
                    td.style.fontWeight = 'bold';
                    td.style.color = '#c2410c';
                }

                tr.appendChild(td);
            }

            tableBody.appendChild(tr);
        }
    }
});

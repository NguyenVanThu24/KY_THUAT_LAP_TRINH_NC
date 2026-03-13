from flask import Flask, render_template, request, jsonify
import sys

# Đảm bảo mã hóa console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

app = Flask(__name__)

# --- RENDERING HTML ---
@app.route('/')
def index():
    return render_template('index.html')

# --- API LOGIC QUY HOẠCH ĐỘNG ---
@app.route('/api/solve', methods=['POST'])
def solve_knapsack():
    try:
        data = request.get_json()
        
        # 1. Nhận và trích xuất dữ liệu
        W = int(data.get('W', 0))
        weights_str = data.get('weights', '')
        values_str = data.get('values', '')
        
        # Validation rỗng
        if W < 0 or not weights_str or not values_str:
            return jsonify({'success': False, 'message': 'Dữ liệu không hợp lệ hoặc bị trống.'}), 400

        # Parse mảng chuỗi thành mảng số nguyên
        try:
            weights = [int(x.strip()) for x in weights_str.split(',')]
            values = [int(x.strip()) for x in values_str.split(',')]
        except ValueError:
            return jsonify({'success': False, 'message': 'Trọng lượng và Phân giá trị phải là các số nguyên ngăn cách nhau bởi dấu phẩy.'}), 400
            
        n = len(weights)
        
        # Validation logic
        if n != len(values):
            return jsonify({'success': False, 'message': 'Số lượng phần tử trong mảng Trọng lượng và Giá trị phải khớp với nhau.'}), 400
        
        if any(w <= 0 for w in weights) or any(v <= 0 for v in values):
             return jsonify({'success': False, 'message': 'Các thuộc tính trọng lượng và giá trị của đồ vật phải là số nguyên dương lớn hơn 0!'}), 400

        # 2. Xử lý thuật toán Quy Hoạch Động
        dp = [[0 for _ in range(W + 1)] for _ in range(n + 1)]
        
        for i in range(1, n + 1):
            for j in range(W + 1):
                if weights[i-1] <= j:
                    dp[i][j] = max(dp[i-1][j], values[i-1] + dp[i-1][j - weights[i-1]])
                else:
                    dp[i][j] = dp[i-1][j]
                    
        max_value = dp[n][W]
        
        # 3. Truy vết tìm lại kết quả (Danh sách các Item VỊ TRÍ) và ghi nhận đường đi hiển thị
        selected_items = []
        path_trace = [] # Mảng chứa các tọa độ [i, j] thuộc đường đi lấy đồ tối ưu
        
        curr_W = W
        for i in range(n, 0, -1):
            if dp[i][curr_W] != dp[i-1][curr_W]:
                # Đồ vật i được lấy (Đi chéo lên và lùi lại W_i)
                selected_items.append(i)
                path_trace.append([i, curr_W]) # Đánh dấu ô hiện tại thuộc chuỗi quyết định
                curr_W -= weights[i-1]
            else:
                 # Đồ vật i bị bỏ qua (Đi thẳng lên trên trên bảng DP)
                path_trace.append([i, curr_W])

        # Phải trace luôn cả điểm gốc (0, current_W cuối cùng)
        path_trace.append([0, curr_W])
        
        selected_items.reverse() # Hiển thị đồ nhỏ -> đồ lớn (tùy ý)
        
        # Trả về kết quả JSON cho JS
        return jsonify({
            'success': True,
            'max_value': max_value,
            'selected_items': selected_items,
            'path_trace': path_trace, # Gửi kèm đường truy vết
            'dp_matrix': dp,
            'weights': weights,
            'values': values,
            'W': W
        })

    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi hệ thống: {str(e)}'}), 500

if __name__ == '__main__':
    # Chạy Flask app bằng cổng mặc định 5000
    app.run(debug=True, port=5000)

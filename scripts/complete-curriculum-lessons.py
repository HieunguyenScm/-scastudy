import json
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'content/curriculum.json'
data = json.loads(path.read_text())
for week in data:
    if week.get('lesson', {}).get('sections'):
        continue
    concepts = week['concepts']
    sections = [
        {'heading': 'Bối cảnh và câu hỏi kinh doanh', 'body': f"{week['summary']} Hãy bắt đầu bằng câu hỏi: quyết định nào trong {week['moduleName']} đang cần dữ liệu hoặc lập luận rõ hơn? Gắn câu hỏi với một sản phẩm FMCG, một channel và một khoảng thời gian cụ thể."},
        {'heading': 'Khung kiến thức cốt lõi', 'body': f"Tuần này tập trung vào {', '.join(concepts)}. Với mỗi khái niệm, hãy viết định nghĩa bằng tiếng Việt, giữ thuật ngữ English, nêu một ví dụ và chỉ ra nó ảnh hưởng tới service, cost hoặc cash như thế nào."},
        {'heading': 'Cách kiểm chứng', 'body': f"Không kết luận chỉ từ một con số. Hãy kiểm tra grain, assumption, dữ liệu đầu vào và baseline trước khi đưa ra recommendation cho deliverable {week['deliverable']}. Ghi lại giới hạn của phân tích."},
    ]
    steps = [
        f"Chọn một sản phẩm hoặc channel FMCG phù hợp với bài: {week['title']}.",
        'Xác định input, grain, assumption và KPI trước khi thao tác.',
        f"Thực hiện task đầu tiên: {week['practice'][0]}.",
        f"Hoàn thiện task tiếp theo: {week['practice'][1] if len(week['practice']) > 1 else week['deliverable']}.",
        'Viết insight theo cấu trúc evidence - impact - action và nêu giới hạn.',
    ]
    week['lesson'] = {
        'coreIdea': f"{week['summary']} Năng lực này là một bước trong lộ trình trở thành Supply Chain Analyst và Demand Planner có tư duy AI.",
        'sections': sections,
        'workedExample': {
            'title': f"FMCG case: {week['title']}",
            'narrative': f"Một doanh nghiệp FMCG cần xử lý bài toán {week['title'].lower()} trong bối cảnh demand, lead time và nguồn lực thay đổi. Analyst phải biến vấn đề thành output có thể kiểm chứng thay vì chỉ trình bày ý kiến.",
            'steps': steps[:3],
            'takeaway': 'Kết luận tốt luôn chỉ rõ bằng chứng, trade-off và hành động tiếp theo.'
        },
        'selfCheck': [
            {'question': f"Mục tiêu chính của tuần {week['week']} là gì?", 'answer': week['objectives'][0]},
            {'question': 'Bạn cần kiểm tra điều gì trước khi tin vào kết quả?', 'answer': 'Kiểm tra grain, dữ liệu đầu vào, assumption, baseline và cách tính KPI.'},
            {'question': 'Kết quả này hỗ trợ quyết định Supply Chain nào?', 'answer': f"Nó hỗ trợ hoàn thiện {week['deliverable']} và lựa chọn action cho bài toán {week['title']} trong bối cảnh FMCG."},
            {'question': 'Một giới hạn thường gặp của phân tích là gì?', 'answer': 'Dữ liệu có thể thiếu, sai grain hoặc không phản ánh promotion, lead time và constraint thực tế; cần ghi rõ giới hạn trước khi triển khai.'},
        ],
    }
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print('completed authored lessons for 24 weeks')

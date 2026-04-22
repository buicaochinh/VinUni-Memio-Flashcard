"""
Test script để debug và tối ưu prompt sinh flashcard.
Giúp tiết kiệm tiền API bằng cách test prompt offline trước khi deploy.
"""

import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import PromptTemplate

load_dotenv()

# Sử dụng cùng prompt với production
CARD_PROMPT = PromptTemplate.from_template(
    """Hãy tạo {count} flashcards học thuật chất lượng cao từ nội dung sau.
Trích xuất các khái niệm quan trọng, định nghĩa, thực thể và quy trình từ NỘI DUNG HỌC THUẬT.

BỎ QUA các thông tin sau với những tài liệu là sách/ tài liệu học thuật (không tạo flashcard từ chúng):
- Tên tác giả, dịch giả, biên tập viên
- Nhà xuất bản (NXB), năm xuất bản, địa chỉ xuất bản
- ISBN, mã số sách, bản quyền, lời cảm ơn
- Mục lục, lời tựa, lời giới thiệu mang tính hành chính
- Header, footer, số trang, watermark

Mỗi thẻ cần câu hỏi rõ ràng và câu trả lời chính xác, ngắn gọn.
Phân loại độ khó: "easy" (dễ nhớ), "medium" (cần luyện tập), "hard" (phức tạp).

NGÔN NGỮ: Xác định ngôn ngữ chính của tài liệu và dùng NHẤT QUÁN ngôn ngữ đó cho toàn bộ flashcards.
Không trộn lẫn ngôn ngữ trong cùng một thẻ hoặc giữa các thẻ.

CHỈ TRẢ VỀ DUY NHẤT 1 MẢNG JSON BẮT ĐẦU BẰNG [ NGAY DÒNG ĐẦU TIÊN, KHÔNG KÈM TEXT.
Format: [{{"front": "câu hỏi", "back": "câu trả lời", "difficulty": "medium", "source_context": "đoạn trích ngắn từ nội dung gốc dùng để tạo thẻ này"}}]

Nội dung: {context}"""
)


def parse_llm_json(content: str) -> list[dict]:
    """Parse JSON từ response của LLM"""
    # Try non-greedy match first to avoid capturing extra text
    match = re.search(r"\[.*?\]", content, re.DOTALL)
    if not match:
        # Fallback: try greedy if non-greedy fails
        match = re.search(r"\[.*\]", content, re.DOTALL)

    if match:
        raw = match.group(0)
    else:
        # Remove markdown code blocks
        raw = content.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw)
    except Exception as e:
        print(f"❌ JSON parsing error: {e}")
        print(f"Raw content:\n{content[:500]}")
        return []


def get_llm():
    """Khởi tạo LLM client"""
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20240620")

    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY không tìm thấy trong .env")

    return ChatAnthropic(
        model=model,
        temperature=0.7,
        anthropic_api_key=api_key,
        base_url="https://api.shopaikey.com"
    )


def test_parsing(sample_text: str, card_count: int = 5):
    """
    Test prompt với đoạn text mẫu

    Args:
        sample_text: Nội dung để sinh card
        card_count: Số lượng card muốn sinh
    """
    print(f"\n{'='*60}")
    print(f"🧪 Testing với {card_count} cards")
    print(f"{'='*60}\n")

    print(f"📝 Input text ({len(sample_text)} chars):")
    print(f"{sample_text[:200]}...\n")

    try:
        llm = get_llm()
        chain = CARD_PROMPT | llm

        print("⏳ Đang gọi API...")
        response = chain.invoke({"context": sample_text, "count": card_count})

        print(f"✅ Response nhận được ({len(response.content)} chars)\n")

        cards = parse_llm_json(response.content)

        if not cards:
            print("❌ Không parse được JSON từ response")
            print(f"\nRaw response:\n{response.content}")
            return

        print(f"✅ Parse thành công {len(cards)} cards\n")
        print(f"{'='*60}")

        for i, card in enumerate(cards, 1):
            print(f"\n📇 Card {i}:")
            print(f"   Front: {card.get('front', 'N/A')}")
            print(f"   Back: {card.get('back', 'N/A')[:100]}...")
            print(f"   Difficulty: {card.get('difficulty', 'N/A')}")
            print(f"   Source: {card.get('source_context', 'N/A')[:80]}...")

        print(f"\n{'='*60}")
        print(f"✅ Test hoàn tất!")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Sample text để test (thay bằng nội dung thật)
    SAMPLE_TEXT = """
    Machine Learning là một nhánh của trí tuệ nhân tạo (AI) cho phép máy tính học từ dữ liệu
    mà không cần được lập trình rõ ràng. Có ba loại chính:

    1. Supervised Learning: Học có giám sát, sử dụng dữ liệu đã được gán nhãn
    2. Unsupervised Learning: Học không giám sát, tìm pattern trong dữ liệu chưa gán nhãn
    3. Reinforcement Learning: Học tăng cường, agent học thông qua thử và sai

    Neural Networks là một kiến trúc phổ biến trong deep learning, lấy cảm hứng từ não người.
    Mỗi neuron nhận input, xử lý qua activation function và truyền output cho layer tiếp theo.
    """

    print("\n🚀 Memio Flashcard Parsing Test")
    print("Công cụ test prompt sinh card trước khi deploy\n")

    # Test với sample text
    test_parsing(SAMPLE_TEXT, card_count=5)

    print("\n💡 Tip: Thay SAMPLE_TEXT bằng nội dung thật để test chất lượng card")
    print("💡 Tip: Thử nghiệm với các giá trị card_count khác nhau")
    print("💡 Tip: Chỉnh sửa CARD_PROMPT ở trên để tối ưu chất lượng\n")

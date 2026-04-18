import json
import os
import re
import sys
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src import database as db
from src.sm2 import get_updated_sm2_values

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

db.init_db()

st.set_page_config(page_title="AI Flashcard VinUni", page_icon="🧠", layout="centered")

st.markdown(
    """
<style>
    .stApp {
        background: radial-gradient(circle at top left, #1e1b4b 0%, #0f172a 100%);
        color: #f8fafc;
    }
    .main-card {
        padding: 40px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        text-align: center;
        min-height: 220px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        margin-bottom: 24px;
    }
    .main-card:hover {
        transform: translateY(-5px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.08);
    }
    .answer-card {
        padding: 30px;
        border-radius: 16px;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        margin-top: 10px;
        color: #a7f3d0;
    }
    .stButton>button {
        width: 100%;
        border-radius: 12px;
        height: 3.2em;
        transition: all 0.3s ease;
        background: rgba(99, 102, 241, 0.1);
        color: #e0e7ff;
        border: 1px solid rgba(99, 102, 241, 0.3);
    }
    .stButton>button:hover {
        background: rgba(99, 102, 241, 0.3);
        border: 1px solid rgba(99, 102, 241, 0.6);
        transform: scale(1.02);
        color: white !important;
    }
    section[data-testid="stSidebar"] {
        background: rgba(15, 23, 42, 0.8);
        backdrop-filter: blur(15px);
        border-right: 1px solid rgba(255, 255, 255, 0.1);
    }
    section[data-testid="stSidebar"] .stMarkdown h2 {
        color: #c084fc;
    }
    .stAlert {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        border-radius: 12px;
    }
    h1 {
        background: linear-gradient(to right, #818cf8, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 800 !important;
    }
</style>
""",
    unsafe_allow_html=True,
)

if "user" not in st.session_state:
    st.session_state.user = None
if "current_deck_id" not in st.session_state:
    st.session_state.current_deck_id = None
if "flashcards" not in st.session_state:
    st.session_state.flashcards = []
if "current_index" not in st.session_state:
    st.session_state.current_index = 0
if "show_answer" not in st.session_state:
    st.session_state.show_answer = False

if st.session_state.user is None:
    st.title("🔐 Đăng nhập AI Flashcard")
    st.write("Chào mừng bạn! Vui lòng sử dụng tài khoản Google để tiếp tục học tập.")

    col_login, _ = st.columns([1, 2])
    with col_login:
        if st.button("🔵 Sign in with Google", use_container_width=True):
            mock_user = db.get_or_create_user(
                "mock_123", "Người dùng VinUni", "user@vinuni.edu.vn"
            )
            st.session_state.user = dict(mock_user)
            st.rerun()

    st.image(
        "https://img.freepik.com/free-vector/user-verification-unauthorized-access-prevention-private-account-authentication-cyber-security-identity-confirmation-concept_335657-2358.jpg",
        width=500,
    )
    st.stop()

user = st.session_state.user
st.sidebar.write(f"👋 Chào, **{user['name']}**")

with st.sidebar:
    st.markdown("---")
    st.header("📚 Bộ thẻ của bạn")

    decks = db.get_user_decks(user["id"])
    deck_names = [d["name"] for d in decks]

    if decks:
        selected_deck_name = st.selectbox("Chọn bộ thẻ để học:", deck_names)
        selected_deck = next(d for d in decks if d["name"] == selected_deck_name)

        if st.session_state.current_deck_id != selected_deck["id"]:
            st.session_state.current_deck_id = selected_deck["id"]
            st.session_state.flashcards = db.get_deck_cards(selected_deck["id"], user["id"])
            st.session_state.current_index = 0
            st.session_state.show_answer = False
            st.rerun()
    else:
        st.info("Bạn chưa có bộ thẻ nào.")

    st.markdown("---")
    new_deck_name = st.text_input("Tên bộ thẻ mới:")
    if st.button("➕ Tạo bộ thẻ") and new_deck_name:
        db.create_deck(user["id"], new_deck_name)
        st.success(f"Đã tạo: {new_deck_name}")
        st.rerun()

    st.markdown("---")
    if st.button("🚪 Đăng xuất"):
        st.session_state.user = None
        st.rerun()

if st.session_state.current_deck_id:
    with st.sidebar:
        st.markdown("---")
        st.header("📄 Thêm nội dung")
        uploaded_file = st.file_uploader("Upload PDF để tạo thẻ tự động", type="pdf")

        if uploaded_file and st.button("✨ Phân tích & Tạo thẻ", use_container_width=True):
            with st.spinner("AI đang xử lý..."):
                try:
                    data_dir = PROJECT_ROOT / "data"
                    data_dir.mkdir(parents=True, exist_ok=True)
                    temp_pdf_path = data_dir / "temp_study.pdf"

                    with temp_pdf_path.open("wb") as f:
                        f.write(uploaded_file.getbuffer())

                    loader = PyPDFLoader(str(temp_pdf_path))
                    pages = loader.load_and_split()
                    context = "\n".join([p.page_content for p in pages[:3]])

                    # Explicitly fetch API key to avoid 401 error
                    api_key_llm = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY") or ""
                    
                    llm = ChatOpenAI(
                        model="openai/gpt-oss-120b", 
                        temperature=0.7,
                        openai_api_base="https://openrouter.ai/api/v1",
                        api_key=api_key_llm
                    )
                    template = """Hãy tạo 5 flashcards từ nội dung sau.
CHỈ TRẢ VỀ DUY NHẤT 1 MẢNG JSON BẮT ĐẦU BẰNG [ NGAY DÒNG ĐẦU TIÊN VÀ KHÔNG KÈM TEXT.
(JSON format: [{{"front": "...", "back": "..."}}]).
Ngôn ngữ: Tiếng Việt. Nội dung: {context}"""
                    prompt = PromptTemplate.from_template(template)
                    chain = prompt | llm

                    response = chain.invoke({"context": context})
                    content = response.content
                    match = re.search(r"\[.*\]", content, re.DOTALL)
                    if match:
                        clean_content = match.group(0)
                    else:
                        clean_content = (
                            content.replace("```json", "").replace("```", "").strip()
                        )

                    cards_data = json.loads(clean_content)

                    for c in cards_data:
                        db.add_flashcard(st.session_state.current_deck_id, c["front"], c["back"])

                    st.success("Đã thêm thẻ mới!")
                    st.session_state.flashcards = db.get_deck_cards(
                        st.session_state.current_deck_id, user["id"]
                    )
                    st.rerun()
                except Exception as e:
                    st.error(f"Lỗi: {e}")

st.title("🧠 AI Smart Flashcards")

if st.session_state.flashcards:
    cards = st.session_state.flashcards
    idx = st.session_state.current_index
    card = cards[idx]

    progress = (idx + 1) / len(cards)
    st.progress(progress)
    st.write(f"Bộ thẻ: **{selected_deck_name}** | Thẻ: **{idx + 1}/{len(cards)}**")

    st.markdown(
        f"""
    <div class="main-card">
        <h2 style="margin:0; color:#ffffff;">{card['front']}</h2>
    </div>
    """,
        unsafe_allow_html=True,
    )

    if not st.session_state.show_answer:
        if st.button("Lật thẻ 🔄 (Space)", key="flip_btn"):
            st.session_state.show_answer = True
            st.rerun()
    else:
        st.markdown(
            f"""
        <div class="answer-card">
            <p style="margin:0; color:#a7f3d0; font-size:1.1em;"><b>Đáp án:</b> {card['back']}</p>
        </div>
        """,
            unsafe_allow_html=True,
        )

        st.markdown("<br>", unsafe_allow_html=True)
        st.write("Đánh giá độ khó:")

        cols = st.columns(4)
        ratings = [("🔁 Lại", 0), ("😫 Khó", 1), ("🙂 Tốt", 2), ("🤩 Dễ", 3)]

        for i, (label, val) in enumerate(ratings):
            with cols[i]:
                if st.button(label, key=f"rate_{val}"):
                    interval, n, ef = get_updated_sm2_values(card, val)
                    db.update_card_progress(user["id"], card["id"], interval, n, ef)

                    if st.session_state.current_index < len(cards) - 1:
                        st.session_state.current_index += 1
                        st.session_state.show_answer = False
                    else:
                        st.success("Bạn đã hoàn thành bộ thẻ này!")
                    st.rerun()

    st.markdown("---")
    col1, col2, col3, col4 = st.columns([1, 1, 1, 1])
    with col1:
        if st.button("⬅️ Trước", disabled=(idx == 0)):
            st.session_state.current_index -= 1
            st.session_state.show_answer = False
            st.rerun()
    with col2:
        if st.button("👍 Like"):
            st.toast("Thanks!")
    with col3:
        if st.button("👎 Dislike"):
            st.toast("Will improve!")
    with col4:
        if st.button("Tiếp ➡️", disabled=(idx == len(cards) - 1)):
            st.session_state.current_index += 1
            st.session_state.show_answer = False
            st.rerun()

    st.components.v1.html(
        """
    <script>
    const doc = window.parent.document;
    doc.addEventListener('keydown', function(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            const btn = Array.from(doc.querySelectorAll('button')).find(b => b.innerText.includes('Lật thẻ'));
            if (btn) btn.click();
        } else if (e.code === 'ArrowRight') {
            const btn = Array.from(doc.querySelectorAll('button')).find(b => b.innerText.includes('Tiếp ➡️'));
            if (btn) btn.click();
        } else if (e.code === 'ArrowLeft') {
            const btn = Array.from(doc.querySelectorAll('button')).find(b => b.innerText.includes('⬅️ Trước'));
            if (btn) btn.click();
        } else if (['1','2','3','4'].includes(e.key)) {
            const labels = ['Lại', 'Khó', 'Tốt', 'Dễ'];
            const btn = Array.from(doc.querySelectorAll('button')).find(b => b.innerText.includes(labels[parseInt(e.key)-1]));
            if (btn) btn.click();
        }
    });
    </script>
    """,
        height=0,
    )
elif st.session_state.current_deck_id is None:
    st.info("👈 Hãy chọn hoặc tạo một Bộ thẻ ở thanh bên để bắt đầu.")
    st.image(
        "https://img.freepik.com/free-vector/hand-drawn-business-planning-concept_23-2149156421.jpg",
        width=500,
    )
else:
    st.info("Bộ thẻ này còn trống. Hãy upload PDF ở thanh bên để tạo thẻ mới!")

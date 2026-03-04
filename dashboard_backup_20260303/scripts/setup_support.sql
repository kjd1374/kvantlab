-- ==============================================================================
-- K-Trend Intelligence Customer Support Tables Schema
-- Re-runnable: Uses IF NOT EXISTS
-- ==============================================================================

-- 1. Create support_inquiries table
CREATE TABLE IF NOT EXISTS public.support_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('inquiry', 'feedback')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    admin_reply TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS) for inquiries
ALTER TABLE public.support_inquiries ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can insert their own inquiries
CREATE POLICY "Users can insert their own inquiries"
ON public.support_inquiries FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Users can view their own inquiries
CREATE POLICY "Users can view their own inquiries"
ON public.support_inquiries FOR SELECT
USING (auth.uid() = user_id);

-- Policy 3: Admins can do everything
CREATE POLICY "Admins can manage inquiries"
ON public.support_inquiries
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_support_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_inquiries_updated_at ON public.support_inquiries;
CREATE TRIGGER trg_support_inquiries_updated_at
BEFORE UPDATE ON public.support_inquiries
FOR EACH ROW
EXECUTE FUNCTION update_support_inquiries_updated_at();


-- 2. Create support_faqs table
CREATE TABLE IF NOT EXISTS public.support_faqs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_ko TEXT NOT NULL,
    answer_ko TEXT NOT NULL,
    question_en TEXT,
    answer_en TEXT,
    is_published BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS) for FAQs
ALTER TABLE public.support_faqs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public (authenticated or not) can view published FAQs
CREATE POLICY "Public can view published FAQs"
ON public.support_faqs FOR SELECT
USING (is_published = true);

-- Policy 2: Admins can do everything
CREATE POLICY "Admins can manage FAQs"
ON public.support_faqs
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Note: No trigger needed for updated_at on FAQs if we don't expect frequent user-facing updates, but added for consistency.
CREATE OR REPLACE FUNCTION update_support_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_faqs_updated_at ON public.support_faqs;
CREATE TRIGGER trg_support_faqs_updated_at
BEFORE UPDATE ON public.support_faqs
FOR EACH ROW
EXECUTE FUNCTION update_support_faqs_updated_at();

-- Insert dummy FAQ data for testing
INSERT INTO public.support_faqs (question_ko, answer_ko, question_en, answer_en, sort_order)
SELECT 
    '회원가입은 어떻게 하나요?', 
    '로그인 팝업에서 "회원가입" 탭을 눌러 이메일 인증 후 가입하실 수 있습니다.', 
    'How do I sign up?', 
    'You can sign up by clicking the "Sign Up" tab in the login popup and verifying your email.', 
    1
WHERE NOT EXISTS (SELECT 1 FROM public.support_faqs WHERE question_ko = '회원가입은 어떻게 하나요?');

INSERT INTO public.support_faqs (question_ko, answer_ko, question_en, answer_en, sort_order)
SELECT 
    '데이터는 언제 업데이트되나요?', 
    '매일 KST 시간 기준 자정에 전일자 데이터 수집 및 분석이 자동으로 진행됩니다.', 
    'When is the data updated?', 
    'Data collection and analysis for the previous day are automatically processed every day at midnight KST.', 
    2
WHERE NOT EXISTS (SELECT 1 FROM public.support_faqs WHERE question_ko = '데이터는 언제 업데이트되나요?');

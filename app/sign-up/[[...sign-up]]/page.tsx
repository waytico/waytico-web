import { SignUp } from '@clerk/nextjs'
import Header from '@/components/header'

export default function SignUpPage() {
  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-background px-4 py-12">
        <SignUp />
      </div>
    </>
  )
}

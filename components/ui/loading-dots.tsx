"use client"

import { motion, Variants } from "framer-motion"

export function LoadingDots() {
    const dotVariants: Variants = {
        pulse: {
            scale: [1, 1.5, 1],
            transition: {
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
            },
        },
    }

    return (
        <motion.div
            animate="pulse"
            transition={{ staggerChildren: -0.2, staggerDirection: -1 }}
            className="flex justify-center items-center gap-1"
        >
            <motion.div
                className="w-1 h-1 rounded-full bg-primary/40 will-change-transform"
                variants={dotVariants}
            />
            <motion.div
                className="w-1 h-1 rounded-full bg-primary/40 will-change-transform"
                variants={dotVariants}
            />
            <motion.div
                className="w-1 h-1 rounded-full bg-primary/40 will-change-transform"
                variants={dotVariants}
            />
        </motion.div>
    )
}
